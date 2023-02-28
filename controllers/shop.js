const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIP_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEM_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  // Product.find()
  //   .then(products => {
  //     res.render('shop/product-list', {
  //       prods: products,
  //       pageTitle: 'All Products',
  //       path: '/products'
  //     });
  //   })
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        /**
         * page 1 = (1 - 1) * 2 --> 0 skip 0, show 1, 2
         * page 2 = (2 - 1) * 2 --> 2 skip 2, show 3, 4
         * ...
         */
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEM_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEM_PER_PAGE) // example --> totalItems(11) / ITER_PER_PAGE(2) = 5.5 ceil to 6 --> last page is 6
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProductById = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product,
        pageTitle: product.title,
        path: '/products'
      })
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        /**
         * page 1 = (1 - 1) * 2 --> 0 skip 0, show 1, 2
         * page 2 = (2 - 1) * 2 --> 2 skip 2, show 3, 4
         * ...
         */
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEM_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEM_PER_PAGE) // example --> totalItems(11) / ITER_PER_PAGE(2) = 5.5 ceil to 6 --> last page is 6
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId') // ไปดึงข้อมูลสินค้าใน table product มาโดยอ้างอิงจาก productId ที่อยู่ใน table user
    .then(user => {
      /** user หน้าตาแบบนี่
       * [
          {
            productId: {
              _id: new ObjectId("63f22b3c183216998ce78527"),
              title: 'bamboo shoot',
              price: 44.44,
              description: 'bamboo shoot    ( แบมบู ชูส )  หน่อไม้',
              imageUrl: 'images/2023-02-19T13:59:23.926Z-bamboo-shoot-300x169.jpeg',
              userId: new ObjectId("63e9ebf8d2e802260444c0ec"),
              __v: 0
            },
            quantity: 1,
            _id: new ObjectId("63f38fae7725b3fba50efd8a")
          },
          {
            productId: {
              _id: new ObjectId("63f22b88183216998ce78533"),
              title: 'pumpkin',
              price: 111,
              description: 'pumpkin   (พัมพฺ’คิน)  ฟักทอง',
              imageUrl: 'images/2023-02-19T14:00:39.886Z-pumpkin-300x169.jpeg',
              userId: new ObjectId("63e9ebf8d2e802260444c0ec"),
              __v: 0
            },
            quantity: 1,
            _id: new ObjectId("63f38fb67725b3fba50efd9a")
          }
        ]
       */
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products
      })
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// ─────────────────────────────add to cart────────────────────────────────────────────────
exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.removeFromCart(prodId)
    .then(() => {
      res.redirect('/cart')
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  /** Get product detail AND user detail */
  req.user
    .populate('cart.items.productId')
    .then(userCart => {
      const products = userCart.cart.items.map(i => {
        return {
          product: { ...i.productId._doc },
          quantity: i.quantity
        }
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders')
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postOrder = (req, res, next) => {
  /** Get product detail AND user detail */
  req.user
    .populate('cart.items.productId')
    .then(userCart => {
      const products = userCart.cart.items.map(i => {
        return {
          product: { ...i.productId._doc },
          quantity: i.quantity
        }
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders')
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById({ _id: orderId })
    .then(order => {
      if (!order) {
        return (new Error('No order found.'));
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('Unauthorized'));
      }

      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      // ─────────────────────────── user pdfkit ──────────────────────────
      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(24).text('Invoice', { underline: true });
      pdfDoc.text('--------------');
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.fontSize(14).text(
          prod.product.title + ' - ' + prod.quantity + ' x ' + prod.product.price
        );
      });
      pdfDoc.text('--------------');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);
      pdfDoc.end();


      // ───────────────────────── created pdf invoce manual ────────────────────────────
      // fs.readFile(invoicePath, (err, data) => {
      //   if(err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"');
      //   res.send(data);
      //   res.end();
      // });


      /** ส่งข้อมูลแบบ stream */
      // แบบแรก
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"');
      // file.pipe(res);

      // แบบสอง คนแนะนำ
      // res.sendFile(invoicePath, { root: '.' }, (err) => {
      //   if (err) {
      //     return next(err);
      //   }
      // });
    })
    .catch(err => next(err));
}

exports.getCheckout = (req, res, next) => {
  let total = 0;
  let products;

  req.user.populate('cart.items.productId')
    .then(user => {
      products = user.cart.items;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });

      // ─────────────────────stripe────────────────────────────────
      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: 'THB',
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
              unit_amount: p.productId.price * 100,
            },
            quantity: p.quantity,
          };
        }),
        mode: 'payment',
        success_url:
          req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        pageTitle: 'Check Out',
        path: '/checkout',
        products: products,
        totalSum: total,
        sessionId: session.id
      })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
}