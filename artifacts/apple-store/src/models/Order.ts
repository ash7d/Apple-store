import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

const shippingAddressSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, maxlength: 254 },
    phone: { type: String, default: "", maxlength: 40 },
    address1: { type: String, required: true, maxlength: 200 },
    address2: { type: String, default: "", maxlength: 200 },
    city: { type: String, required: true, maxlength: 120 },
    region: { type: String, required: true, maxlength: 120 },
    postalCode: { type: String, required: true, maxlength: 40 },
    country: { type: String, required: true, maxlength: 80 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd", required: true },
    shippingAddress: { type: shippingAddressSchema, required: false },
    stripeSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null },
    inventoryReserved: { type: Boolean, default: false, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "expired"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true },
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  user: Types.ObjectId;
};

const Order =
  (mongoose.models.Order as Model<OrderDocument> | undefined) ??
  mongoose.model<OrderDocument>("Order", orderSchema);

export default Order;
