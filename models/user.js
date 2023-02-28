const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  cart: { 
    items: [
      { 
        // productId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
        productId: { 
          type: Schema.Types.ObjectId, // to use ObjectId type we need to leverage Schema.Types 
          required: true,
          ref: 'Product'
        }, 
        quantity: { 
          type: Number, 
          required: true 
        }
      }
    ]
  },
  resetToken: String,
  resetTokenExpiration: Date
});

userSchema.methods.addToCart = function(product) {
  const cartProductIndex = this.cart.items.findIndex(i => i.productId.toString() === product._id.toString());
  const updatedCartItems = [...this.cart.items];
  let newQuantity = 1;

  /** product already exising */
  if(cartProductIndex >= 0) {
    // -- สมมุติอันเดิมมี 3 บวกพึ่งเพิ่มมาใหม่อีก 1 เป็น 4
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    // -- set quantity ใหม่ให้ product ตัวนั้น */
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    /** add new product */
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity // 1
    });
  }
  this.cart.items = updatedCartItems;
  return this.save();
}

userSchema.methods.removeFromCart = function(productId) {
  const updatedCartItem = this.cart.items.filter(i => i.productId.toString() !== productId.toString());
  this.cart.items = updatedCartItem;
  return this.save();
}

userSchema.methods.clearCart = function() {
  this.cart = {items: []};
  return this.save();
}


/** Created usermodel from userschema */
module.exports = mongoose.model('User', userSchema);

















// const mongodb = require('mongodb');
// const { getDb } = require('../util/database');

// const ObjectId = mongodb.ObjectId;


// class User {
//   constructor(name, email, cart, id) {
//     this.name = name;
//     this.email = email;
//     this.cart = cart; // cart: { items: [{ title: xxx, price: 222, ... }]}
//     this._id = id;
//   }

//   save() {
//     const db = getDb();
//     /** 
//      * return the cursor of mongodb
//      */
//     return db.collection('users').insertOne(this);
//   }

//   addToCart(product) {
//     /** pull out existing product */
//     const cartProductIndex = this.cart.items.findIndex(cp => cp.productId.toString() === product._id.toString());
//     let newQuantity = 1;
//     const updatedCartItems = [...this.cart.items];

//     // product already existing in the cart
//     if (cartProductIndex >= 0) {
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//     } else {
//       updatedCartItems.push({
//         productId: new ObjectId(product._id),
//         quantity: newQuantity
//       });
//     }

//     /** add new product */
//     const updatedProduct = {
//       items: updatedCartItems
//     };

//     /** add cart into user */
//     const db = getDb();
//     return db.collection('users')
//       .updateOne({ _id: new ObjectId(this._id) }, { $set: { cart: updatedProduct } });
//   }

//   getCart() {
//     const db = getDb();
//     // -- pullout productId were in cart of user
//     const cartProdIds = this.cart.items.map(c => c.productId);
//     let updatedCartProdIds = [];
//     let updatedCartItem;

//     db.collection('products')
//       .find()
//       .toArray()
//       .then(products => {
//         for(const product of products) {
//           const productIndex = cartProdIds.findIndex(cid => cid.toString() === product._id.toString());
//           if(productIndex >= 0) updatedCartProdIds.push(product._id);
//         }
//       })
//       .then(result => {
//         // -- update cart of user
//         // return db.collection('users').find().toArray();
//         updatedCartItem = updatedCartProdIds.map(pi => {
//           return {
//             productId: new ObjectId(pi),
//             quantity: this.cart.items.find(i => i.productId.toString() === pi.toString()).quantity
//           }
//         });

//         // -- update item in cart
//         const updatedProduct = {
//           items: updatedCartItem
//         }
//         db.collection('users').updateOne({_id: new ObjectId(this._id)}, {$set: {cart: updatedProduct}})
//       })


    
//     // -- fetch products data from products collection.
//     return db.collection('products')
//       .find({ _id: { $in: cartProdIds } })
//       .toArray()
//       .then(products => {
//         return products.map(p => {
//           return {
//             ...p,
//             quantity: this.cart.items.find(i => i.productId.toString() === p._id.toString()).quantity
//           }
//         })
//       });
//   }

//   deleteItemFromCart(productId) {
//     const updatedCartItems = this.cart.items.filter(i => i.productId.toString() !== productId.toString());

//     const db = getDb();
//     return db.collection('users').updateOne(
//       {
//         _id: new ObjectId(this._id)
//       },
//       {
//         $set: { cart: { items: updatedCartItems } }
//       });
//   }

//   addOrder() {
//     const db = getDb();

//     return this.getCart()
//       .then(products => {
//         const order = {
//           items: products,
//           user: {
//             _id: new ObjectId(this._id),
//             name: this.name
//           }
//         }
//         return db.collection('orders').insertOne(order)
//       })
//       .then(result => {
//         // -- clear this.cart on user obj.
//         this.cart = { items: [] };
//         // -- clear cart on db
//         return db.collection('users').updateOne({ _id: new ObjectId(this._id) }, { $set: { cart: { items: [] } } });
//       });
//   }

//   getOrders() {
//     const db = getDb();
//     return db.collection('orders').find({'user._id': new ObjectId(this._id)}).toArray();
//   }

//   static findById(userId) {
//     const db = getDb();
//     return db.collection('users')
//       .find({ _id: new ObjectId(userId) })
//       .next();
//   }
// }

// module.exports = User;