import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, maxlength: 4000 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, default: "Apple" },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    stock: { type: Number, required: true, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    stripeProductId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
    stripePriceAmountCents: { type: Number, default: null },
  },
  { timestamps: true },
);

export type ProductDocument = InferSchemaType<typeof productSchema>;

const Product =
  (mongoose.models.Product as Model<ProductDocument> | undefined) ??
  mongoose.model<ProductDocument>("Product", productSchema);

export default Product;
