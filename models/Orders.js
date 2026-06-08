const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  factory: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  selectedSize: { type: String },
  selectedColor: { type: String },
  specifications: { type: String },
  notes: { type: String },
  productData: { type: Object },
  isPaidByBrand: { type: Boolean, default: false },
  dueDate: { type: Date },
  type: { type: String },
  orderId: { type: String },
  productOption: { type: Object },
  status: {
    type: String,
    enum: [
      'pending', 'accepted', 'rejected', 'pending_payment',
      'in_progress', 'waiting_delivery', 'out_for_delivery',
      'delivered', 'done',
    ],
    default: 'pending',
  },

  // ✅ Payment
  totalPrice: { type: Number },
  deposit: { type: Number },
  paymentMethod: { type: String },
currency: { type: String, default: 'EGP' },
  // ✅ Delivery
  deliveryDate: { type: Date },
  shippingMethod: { type: String },

  // ✅ Production
  materials: { type: String },
  manufacturingTime: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);