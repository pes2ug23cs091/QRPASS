import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Types
export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  role: UserRole;
  password?: string; // In a real app, never store plain text! Mockup only.
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  bannerUrl?: string; // Add banner image support
  capacity?: number; // Add capacity limit
}

export interface AdditionalDetails {
  dietary?: string;
  tshirtSize?: string;
  emergencyContact?: string;
  organization?: string;
}

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  status: "pending" | "attended";
  registeredAt: string;
  scannedAt?: string;
  qrCodeData: string;
  additionalDetails?: AdditionalDetails;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AppContextType {
  user: User | null;
  users: User[];
  events: Event[];
  registrations: Registration[];
  notifications: Notification[];
  login: (username: string, role: UserRole, password?: string) => boolean;
  logout: () => void;
  registerUser: (userData: Omit<User, "id">) => void;
  createEvent: (eventData: Omit<Event, "id">) => void;
  registerForEvent: (eventId: string, details?: AdditionalDetails) => Registration | null;
  cancelRegistration: (registrationId: string) => void;
  scanQRCode: (qrData: string) => { success: boolean; message: string; registration?: Registration };
  updateRegistrationStatus: (regId: string, status: "attended") => void;
  markNotificationRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock Data
const MOCK_USERS: User[] = [
  {
    id: "admin-1",
    username: "admin",
    name: "System Admin",
    email: "admin@qrpass.com",
    mobile: "0000000000",
    department: "IT",
    role: "admin",
    password: "admin",
  },
  {
    id: "user-1",
    username: "johndoe",
    name: "John Doe",
    email: "john@example.com",
    mobile: "1234567890",
    department: "Engineering",
    role: "user",
    password: "user",
  },
  {
    id: "user-2",
    username: "janesmith",
    name: "Jane Smith",
    email: "jane@example.com",
    mobile: "0987654321",
    department: "Marketing",
    role: "user",
    password: "user",
  },
];

const MOCK_EVENTS: Event[] = [
  {
    id: "evt-1",
    title: "Annual Tech Summit 2026",
    date: "2026-03-15",
    location: "Grand Hall A",
    description: "The biggest tech conference of the year.",
    status: "upcoming",
    bannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070",
    capacity: 500,
  },
  {
    id: "evt-2",
    title: "Leadership Workshop",
    date: "2026-02-20",
    location: "Room 101",
    description: "Interactive session for team leads.",
    status: "active",
    bannerUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=2070",
    capacity: 50,
  },
];

const MOCK_REGISTRATIONS: Registration[] = [
  {
    id: "reg-1",
    userId: "user-1",
    eventId: "evt-1",
    status: "pending",
    registeredAt: new Date().toISOString(),
    qrCodeData: JSON.stringify({ uid: "user-1", eid: "evt-1", rid: "reg-1" }),
    additionalDetails: { dietary: "None", tshirtSize: "L" }
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    title: "Event Reminder",
    message: "Don't forget the Leadership Workshop tomorrow!",
    timestamp: new Date().toISOString(),
    read: false,
  }
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [registrations, setRegistrations] = useState<Registration[]>(MOCK_REGISTRATIONS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const { toast } = useToast();

  const login = (username: string, role: UserRole, password?: string) => {
    const foundUser = users.find((u) => 
      u.username === username && 
      u.role === role && 
      u.password === password
    );
    
    if (foundUser) {
      setUser(foundUser);
      toast({ title: "Welcome back!", description: `Logged in as ${foundUser.name}` });
      return true;
    }
    toast({ title: "Login Failed", description: "Invalid username, role, or password", variant: "destructive" });
    return false;
  };

  const logout = () => {
    setUser(null);
    toast({ title: "Logged out" });
  };

  const registerUser = (userData: Omit<User, "id">) => {
    if (users.some(u => u.username === userData.username)) {
       toast({ title: "Registration Failed", description: "Username already exists", variant: "destructive" });
       return;
    }

    const newUser = { ...userData, id: `user-${Date.now()}` };
    setUsers([...users, newUser]);
    toast({ title: "Account Created", description: "You can now login with your username and password." });
  };

  const createEvent = (eventData: Omit<Event, "id">) => {
    const newEvent = { ...eventData, id: `evt-${Date.now()}` };
    setEvents([...events, newEvent]);
    toast({ title: "Event Created", description: eventData.title });
  };

  const registerForEvent = (eventId: string, details?: AdditionalDetails) => {
    if (!user) return null;
    
    // Check capacity
    const event = events.find(e => e.id === eventId);
    if (event?.capacity) {
      const currentCount = registrations.filter(r => r.eventId === eventId).length;
      if (currentCount >= event.capacity) {
        toast({ title: "Event Full", description: "Sorry, this event has reached capacity.", variant: "destructive" });
        return null;
      }
    }

    const existing = registrations.find(r => r.userId === user.id && r.eventId === eventId);
    if (existing) {
      toast({ title: "Already Registered", variant: "destructive" });
      return existing;
    }

    const regId = `reg-${Date.now()}`;
    const newReg: Registration = {
      id: regId,
      userId: user.id,
      eventId: eventId,
      status: "pending",
      registeredAt: new Date().toISOString(),
      qrCodeData: JSON.stringify({ uid: user.id, eid: eventId, rid: regId }),
      additionalDetails: details,
    };

    setRegistrations([...registrations, newReg]);
    
    // Mock Notification
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: "Registration Confirmed",
      message: `You are registered for ${event?.title}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications([newNotif, ...notifications]);

    return newReg;
  };

  const cancelRegistration = (registrationId: string) => {
    setRegistrations(registrations.filter(r => r.id !== registrationId));
    toast({ title: "Registration Cancelled", description: "Your pass has been removed." });
  };

  const scanQRCode = (qrData: string) => {
    try {
      const data = JSON.parse(qrData); 
      const registration = registrations.find(r => r.id === data.rid);
      
      if (!registration) {
        return { success: false, message: "Invalid Pass: Registration not found" };
      }
      
      if (registration.status === "attended") {
        return { success: false, message: "Pass already used / User already attended" };
      }

      updateRegistrationStatus(registration.id, "attended");
      return { success: true, message: "Access Granted", registration };

    } catch (e) {
      return { success: false, message: "Invalid QR Code Format" };
    }
  };

  const updateRegistrationStatus = (regId: string, status: "attended") => {
    setRegistrations(prev => prev.map(r => 
      r.id === regId ? { ...r, status, scannedAt: new Date().toISOString() } : r
    ));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider value={{
      user, users, events, registrations, notifications,
      login, logout, registerUser, createEvent, registerForEvent, cancelRegistration, scanQRCode, updateRegistrationStatus, markNotificationRead
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
