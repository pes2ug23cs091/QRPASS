import mongoose, { Schema, Document } from "mongoose";

export interface IAdditionalDetails {
  dietary?: string;
  tshirtSize?: string;
  emergencyContact?: string;
  organization?: string;
}

export interface IRegistration extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  status: "pending" | "attended";
  registeredAt: Date;
  scannedAt?: Date;
  qrCodeData: string;
  additionalDetails?: IAdditionalDetails;
}

const RegistrationSchema = new Schema<IRegistration>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  status: { type: String, enum: ["pending", "attended"], default: "pending" },
  registeredAt: { type: Date, default: Date.now },
  scannedAt: { type: Date },
  qrCodeData: { type: String, required: true },
  additionalDetails: {
    dietary: { type: String },
    tshirtSize: { type: String },
    emergencyContact: { type: String },
    organization: { type: String }
  }
});

// Ensure a user can only register once per event
RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const Registration = mongoose.model<IRegistration>("Registration", RegistrationSchema);
