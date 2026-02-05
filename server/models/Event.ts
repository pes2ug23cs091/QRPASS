import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  date: string;
  location: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  bannerUrl?: string;
  capacity?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
  bannerUrl: { type: String },
  capacity: { type: Number },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Event = mongoose.model<IEvent>("Event", EventSchema);
