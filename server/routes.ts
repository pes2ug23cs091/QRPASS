import type { Express, Response } from "express";
import { type Server } from "http";
import cookieParser from "cookie-parser";
import { User, Event, Registration, Notification } from "./models";
import { authMiddleware, adminMiddleware, generateToken, AuthRequest } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Cookie parser for JWT tokens
  app.use(cookieParser());

  // ============ AUTH ROUTES ============

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, name, email, mobile, department, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      // Create user
      const user = await User.create({
        username,
        password,
        name,
        email,
        mobile,
        department,
        role: role || "user"
      });

      // Generate token
      const token = generateToken(user._id.toString());

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
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
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
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

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
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
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    res.json({
      user: {
        id: req.user!._id,
        username: req.user!.username,
        name: req.user!.name,
        email: req.user!.email,
        mobile: req.user!.mobile,
        department: req.user!.department,
        role: req.user!.role
      }
    });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  });

  // ============ EVENTS ROUTES ============

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await Event.find().sort({ date: 1 });
      res.json(events.map(e => ({
        id: e._id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description,
        status: e.status,
        bannerUrl: e.bannerUrl,
        capacity: e.capacity
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create event (admin only)
  app.post("/api/events", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { title, date, location, description, status, bannerUrl, capacity } = req.body;

      const event = await Event.create({
        title,
        date,
        location,
        description,
        status: status || "upcoming",
        bannerUrl,
        capacity,
        createdBy: req.user!._id
      });

      res.status(201).json({
        id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        status: event.status,
        bannerUrl: event.bannerUrl,
        capacity: event.capacity
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update event (admin only)
  app.put("/api/events/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({
        id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        status: event.status,
        bannerUrl: event.bannerUrl,
        capacity: event.capacity
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete event (admin only)
  app.delete("/api/events/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await Event.findByIdAndDelete(req.params.id);
      await Registration.deleteMany({ eventId: req.params.id });
      res.json({ message: "Event deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ REGISTRATIONS ROUTES ============

  // Get user's registrations
  app.get("/api/registrations", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const registrations = await Registration.find({ userId: req.user!._id })
        .populate("eventId");
      res.json(registrations.map(r => ({
        id: r._id,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
        registeredAt: r.registeredAt,
        scannedAt: r.scannedAt,
        qrCodeData: r.qrCodeData,
        additionalDetails: r.additionalDetails
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all registrations (admin only)
  app.get("/api/registrations/all", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const registrations = await Registration.find();
      res.json(registrations.map(r => ({
        id: r._id,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
        registeredAt: r.registeredAt,
        scannedAt: r.scannedAt,
        qrCodeData: r.qrCodeData,
        additionalDetails: r.additionalDetails
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register for event
  app.post("/api/registrations", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, additionalDetails } = req.body;

      // Check if already registered
      const existing = await Registration.findOne({
        userId: req.user!._id,
        eventId
      });
      if (existing) {
        return res.status(400).json({ message: "Already registered for this event" });
      }

      // Check event capacity
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.capacity) {
        const count = await Registration.countDocuments({ eventId });
        if (count >= event.capacity) {
          return res.status(400).json({ message: "Event is at full capacity" });
        }
      }

      const registration = await Registration.create({
        userId: req.user!._id,
        eventId,
        qrCodeData: JSON.stringify({
          uid: req.user!._id,
          eid: eventId,
          rid: Date.now().toString()
        }),
        additionalDetails
      });

      res.status(201).json({
        id: registration._id,
        userId: registration.userId,
        eventId: registration.eventId,
        status: registration.status,
        registeredAt: registration.registeredAt,
        qrCodeData: registration.qrCodeData,
        additionalDetails: registration.additionalDetails
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel registration
  app.delete("/api/registrations/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const registration = await Registration.findOne({
        _id: req.params.id,
        userId: req.user!._id
      });
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      await registration.deleteOne();
      res.json({ message: "Registration cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Scan QR code (admin only)
  app.post("/api/registrations/scan", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
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
      }).populate("userId", "-password").populate("eventId");

      if (!registration) {
        return res.status(404).json({ success: false, message: "Registration not found" });
      }

      if (registration.status === "attended") {
        return res.json({ 
          success: false, 
          message: "Already scanned",
          registration
        });
      }

      registration.status = "attended";
      registration.scannedAt = new Date();
      await registration.save();

      res.json({ 
        success: true, 
        message: "Attendance marked successfully",
        registration
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============ NOTIFICATIONS ROUTES ============

  // Get user notifications
  app.get("/api/notifications", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const notifications = await Notification.find({ userId: req.user!._id })
        .sort({ timestamp: -1 });
      res.json(notifications.map(n => ({
        id: n._id,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        read: n.read
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await Notification.findByIdAndUpdate(req.params.id, { read: true });
      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ USERS ROUTES (Admin) ============

  // Get all users (admin only)
  app.get("/api/users", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const users = await User.find().select("-password");
      res.json(users.map(u => ({
        id: u._id,
        username: u.username,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        department: u.department,
        role: u.role
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
