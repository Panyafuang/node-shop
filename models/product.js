const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Schema -> Model base on schema -> Object base on model
 */
const productSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: 'User'
  }
});


module.exports = mongoose.model('Product', productSchema)



























// const mongodb = require('mongodb');

// const getDb = require('../util/database').getDb;


// class Product {
//   constructor(title, price, description, imageUrl, id, userId) {
//     this.title = title;
//     this.price = price;
//     this.description = description;
//     this.imageUrl = imageUrl;
//     this._id = id ? new mongodb.ObjectId(id) : null;
//     this.userId = userId;
//   }

//   save() {
//     const db = getDb();
//     let dbOp;
//     if (this._id) {
//       // -- Update the product
//       dbOp = db.collection('products').updateOne({ _id: this._id }, {
//         $set: this
//       });
//     } else {
//       // -- Add new product
//       dbOp = db.collection('products').insertOne(this);
//     }

//     return dbOp
//       .then(result => {
//         console.log(result);
//       })
//       .catch(err => {
//         console.log(err);
//       });
//   }

//   static fetchAll() {
//     const db = getDb();
//     /** collection = table */
//     return db.collection('products').find().toArray()
//       .then(products => {
//         return products;
//       })
//       .catch(err => console.log(err));
//   }

//   static findById(prodId) {
//     const db = getDb();

//     return db.collection('products')
//       .find({ _id: new mongodb.ObjectId(prodId) })
//       .next()
//       .then(product => {
//         console.log(product);
//         return product;
//       })
//       .catch(err => console.log(err));
//   }

//   static deleteById(prodId) {
//     const db = getDb();
//     return db.collection('products').deleteOne({_id: new mongodb.ObjectId(prodId)})
//   }
// }

// module.exports = Product;