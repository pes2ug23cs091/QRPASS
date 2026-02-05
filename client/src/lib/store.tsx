import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  bannerUrl?: string;
  capacity?: number;
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
  isLoading: boolean;
  login: (username: string, role: UserRole, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  registerUser: (userData: Omit<User, "id"> & { password: string }) => Promise<boolean>;
  createEvent: (eventData: Omit<Event, "id">) => Promise<void>;
  registerForEvent: (eventId: string, details?: AdditionalDetails) => Promise<Registration | null>;
  cancelRegistration: (registrationId: string) => Promise<void>;
  scanQRCode: (qrData: string) => Promise<{ success: boolean; message: string; registration?: Registration }>;
  updateRegistrationStatus: (regId: string, status: "attended") => void;
  markNotificationRead: (id: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshRegistrations: (isAdmin?: boolean) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

async function apiRequest(method: string, url: string, data?: unknown) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  return res;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.log("Not authenticated");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load events on mount
  useEffect(() => {
    refreshEvents();
  }, []);

  // Load registrations when user is logged in
  useEffect(() => {
    if (user) {
      refreshRegistrations(user.role === "admin");
      refreshNotifications();
      if (user.role === "admin") {
        refreshUsers();
      }
    }
  }, [user]);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  }, []);

  const refreshRegistrations = useCallback(async (isAdmin: boolean = false) => {
    try {
      const endpoint = isAdmin ? "/api/registrations/all" : "/api/registrations";
      const res = await apiRequest("GET", endpoint);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch (error) {
      console.error("Failed to load registrations:", error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }, []);

  const login = async (username: string, role: UserRole, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password, role });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast({ title: "Welcome back!", description: `Logged in as ${data.user.name}` });
        return true;
      } else {
        const error = await res.json();
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        return false;
      }
    } catch (error) {
      toast({ title: "Login Failed", description: "Network error", variant: "destructive" });
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setRegistrations([]);
      setNotifications([]);
      toast({ title: "Logged out" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const registerUser = async (userData: Omit<User, "id"> & { password: string }): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast({ title: "Account Created", description: "Welcome to QRPASS!" });
        return true;
      } else {
        const error = await res.json();
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
        return false;
      }
    } catch (error) {
      toast({ title: "Registration Failed", description: "Network error", variant: "destructive" });
      return false;
    }
  };

  const createEvent = async (eventData: Omit<Event, "id">) => {
    try {
      const res = await apiRequest("POST", "/api/events", eventData);
      
      if (res.ok) {
        const newEvent = await res.json();
        setEvents([...events, newEvent]);
        toast({ title: "Event Created", description: eventData.title });
      } else {
        const error = await res.json();
        toast({ title: "Failed to create event", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to create event", description: "Network error", variant: "destructive" });
    }
  };

  const registerForEvent = async (eventId: string, details?: AdditionalDetails): Promise<Registration | null> => {
    if (!user) return null;

    try {
      const res = await apiRequest("POST", "/api/registrations", { eventId, additionalDetails: details });
      
      if (res.ok) {
        const newReg = await res.json();
        setRegistrations([...registrations, newReg]);
        
        const event = events.find(e => e.id === eventId);
        toast({ title: "Registration Confirmed", description: `You are registered for ${event?.title}` });
        return newReg;
      } else {
        const error = await res.json();
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
        return null;
      }
    } catch (error) {
      toast({ title: "Registration Failed", description: "Network error", variant: "destructive" });
      return null;
    }
  };

  const cancelRegistration = async (registrationId: string) => {
    try {
      const res = await apiRequest("DELETE", `/api/registrations/${registrationId}`);
      
      if (res.ok) {
        setRegistrations(registrations.filter(r => r.id !== registrationId));
        toast({ title: "Registration Cancelled", description: "Your pass has been removed." });
      } else {
        const error = await res.json();
        toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to cancel", description: "Network error", variant: "destructive" });
    }
  };

  const scanQRCode = async (qrData: string): Promise<{ success: boolean; message: string; registration?: Registration }> => {
    try {
      const res = await apiRequest("POST", "/api/registrations/scan", { qrData });
      const data = await res.json();
      
      if (data.success) {
        // Update local state - pass isAdmin flag to fetch all registrations for admin
        await refreshRegistrations(user?.role === "admin");
      }
      
      return data;
    } catch (error) {
      return { success: false, message: "Network error" };
    }
  };

  const updateRegistrationStatus = (regId: string, status: "attended") => {
    setRegistrations(prev => prev.map(r => 
      r.id === regId ? { ...r, status, scannedAt: new Date().toISOString() } : r
    ));
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <AppContext.Provider value={{
      user, users, events, registrations, notifications, isLoading,
      login, logout, registerUser, createEvent, registerForEvent, 
      cancelRegistration, scanQRCode, updateRegistrationStatus, markNotificationRead,
      refreshEvents, refreshRegistrations, refreshUsers
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
