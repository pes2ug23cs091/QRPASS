import type { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDB } from "./_db";

type VercelRequest = IncomingMessage & { 
  body?: any; 
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  end: () => VercelResponse;
};

// ============ MODELS ============
import bcrypt from "bcryptjs";

// User Model
interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  role: "admin" | "user";
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Event Model
const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
  bannerUrl: { type: String },
  capacity: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

// Registration Model
const RegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
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

RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);

// Notification Model
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

// ============ AUTH HELPERS ============
function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

function verifyToken(token: string): { userId: string } {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return jwt.verify(token, secret) as { userId: string };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach(cookie => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) cookies[name] = value;
  });
  return cookies;
}

async function getAuthUser(req: VercelRequest): Promise<any | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");
    return user;
  } catch {
    return null;
  }
}

function setCookie(res: VercelResponse, name: string, value: string, maxAge: number) {
  res.setHeader("Set-Cookie", `${name}=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}`);
}

function clearCookie(res: VercelResponse, name: string) {
  res.setHeader("Set-Cookie", `${name}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`);
}

// ============ MAIN HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("DB Connection Error:", error);
    return res.status(500).json({ message: "Database connection failed" });
  }

  const { method } = req;
  // Parse the original URL to get the path
  let path = req.url?.split("?")[0] || "";
  // Ensure path starts with /api
  if (!path.startsWith("/api")) {
    path = "/api" + path;
  }
  
  // Debug logging
  console.log(`[API] ${method} ${path}`);

  try {
    // ============ AUTH ROUTES ============
    
    // POST /api/auth/register
    if (path === "/api/auth/register" && method === "POST") {
      const { username, password, name, email, mobile, department, role } = req.body;

      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      const user = await User.create({
        username, password, name, email, mobile, department,
        role: role || "user"
      });

      const token = generateToken(user._id.toString());
      setCookie(res, "token", token, 7 * 24 * 60 * 60);

      return res.status(201).json({
        message: "Registration successful",
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          department: user.department,
          role: user.role
        }
      });
    }

    // POST /api/auth/login
    if (path === "/api/auth/login" && method === "POST") {
      const { username, password, role } = req.body;

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (role && user.role !== role) {
        return res.status(401).json({ message: "Role mismatch" });
      }

      const token = generateToken(user._id.toString());
      setCookie(res, "token", token, 7 * 24 * 60 * 60);

      return res.json({
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          department: user.department,
          role: user.role
        }
      });
    }

    // GET /api/auth/me
    if (path === "/api/auth/me" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      return res.json({
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          department: user.department,
          role: user.role
        }
      });
    }

    // POST /api/auth/logout
    if (path === "/api/auth/logout" && method === "POST") {
      clearCookie(res, "token");
      return res.json({ message: "Logged out successfully" });
    }

    // ============ EVENTS ROUTES ============

    // GET /api/events
    if (path === "/api/events" && method === "GET") {
      const events = await Event.find().sort({ date: 1 });
      return res.json(events.map((e: any) => ({
        id: e._id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description,
        status: e.status,
        bannerUrl: e.bannerUrl,
        capacity: e.capacity
      })));
    }

    // POST /api/events (admin only)
    if (path === "/api/events" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const { title, date, location, description, status, bannerUrl, capacity } = req.body;
      const event = await Event.create({
        title, date, location, description,
        status: status || "upcoming",
        bannerUrl, capacity,
        createdBy: user._id
      });

      return res.status(201).json({
        id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        status: event.status,
        bannerUrl: event.bannerUrl,
        capacity: event.capacity
      });
    }

    // PUT /api/events/:id
    if (path.match(/^\/api\/events\/[^\/]+$/) && method === "PUT") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const id = path.split("/").pop();
      const event = await Event.findByIdAndUpdate(id, req.body, { new: true });
      if (!event) return res.status(404).json({ message: "Event not found" });

      return res.json({
        id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        status: event.status,
        bannerUrl: event.bannerUrl,
        capacity: event.capacity
      });
    }

    // DELETE /api/events/:id
    if (path.match(/^\/api\/events\/[^\/]+$/) && method === "DELETE") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const id = path.split("/").pop();
      await Event.findByIdAndDelete(id);
      await Registration.deleteMany({ eventId: id });
      return res.json({ message: "Event deleted" });
    }

    // ============ REGISTRATIONS ROUTES ============

    // GET /api/registrations
    if (path === "/api/registrations" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });

      const registrations = await Registration.find({ userId: user._id }).populate("eventId");
      return res.json(registrations.map((r: any) => ({
        id: r._id,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
        registeredAt: r.registeredAt,
        scannedAt: r.scannedAt,
        qrCodeData: r.qrCodeData,
        additionalDetails: r.additionalDetails
      })));
    }

    // GET /api/registrations/all (admin only)
    if (path === "/api/registrations/all" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const registrations = await Registration.find();
      return res.json(registrations.map((r: any) => ({
        id: r._id,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
        registeredAt: r.registeredAt,
        scannedAt: r.scannedAt,
        qrCodeData: r.qrCodeData,
        additionalDetails: r.additionalDetails
      })));
    }

    // POST /api/registrations
    if (path === "/api/registrations" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });

      const { eventId, additionalDetails } = req.body;

      const existingReg = await Registration.findOne({ userId: user._id, eventId });
      if (existingReg) {
        return res.status(400).json({ message: "Already registered for this event" });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.capacity) {
        const regCount = await Registration.countDocuments({ eventId });
        if (regCount >= event.capacity) {
          return res.status(400).json({ message: "Event is at full capacity" });
        }
      }

      const qrCodeData = JSON.stringify({ uid: user._id, eid: eventId, t: Date.now() });

      const registration = await Registration.create({
        userId: user._id,
        eventId,
        qrCodeData,
        additionalDetails
      });

      await Notification.create({
        userId: user._id,
        title: "Registration Confirmed",
        message: `You have successfully registered for ${event.title}`
      });

      return res.status(201).json({
        message: "Registration successful",
        registration: {
          id: registration._id,
          userId: registration.userId,
          eventId: registration.eventId,
          status: registration.status,
          registeredAt: registration.registeredAt,
          qrCodeData: registration.qrCodeData,
          additionalDetails: registration.additionalDetails
        }
      });
    }

    // DELETE /api/registrations/:id
    if (path.match(/^\/api\/registrations\/[^\/]+$/) && !path.includes("/scan") && !path.includes("/all") && method === "DELETE") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });

      const id = path.split("/").pop();
      const registration = await Registration.findById(id);

      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.userId.toString() !== user._id.toString() && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      await registration.deleteOne();
      return res.json({ message: "Registration cancelled" });
    }

    // POST /api/registrations/scan (admin only)
    if (path === "/api/registrations/scan" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const { qrData } = req.body;

      let parsed;
      try {
        parsed = JSON.parse(qrData);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid QR code format" });
      }

      const registration = await Registration.findOne({
        userId: parsed.uid,
        eventId: parsed.eid
      }).populate("userId").populate("eventId");

      if (!registration) {
        return res.status(404).json({ success: false, message: "Registration not found" });
      }

      if (registration.status === "attended") {
        return res.json({ success: false, message: "Already scanned", registration });
      }

      registration.status = "attended";
      registration.scannedAt = new Date();
      await registration.save();

      return res.json({ success: true, message: "Attendance marked successfully", registration });
    }

    // ============ NOTIFICATIONS ROUTES ============

    // GET /api/notifications
    if (path === "/api/notifications" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });

      const notifications = await Notification.find({ userId: user._id }).sort({ timestamp: -1 });
      return res.json(notifications.map((n: any) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        read: n.read
      })));
    }

    // PATCH /api/notifications/:id/read
    if (path.match(/^\/api\/notifications\/[^\/]+\/read$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });

      const parts = path.split("/");
      const id = parts[parts.length - 2];
      await Notification.findByIdAndUpdate(id, { read: true });
      return res.json({ message: "Notification marked as read" });
    }

    // ============ USERS ROUTES (Admin) ============

    // GET /api/users
    if (path === "/api/users" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const users = await User.find().select("-password");
      return res.json(users.map((u: any) => ({
        id: u._id,
        username: u.username,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        department: u.department,
        role: u.role
      })));
    }

    // Route not found
    return res.status(404).json({ message: "API route not found" });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
