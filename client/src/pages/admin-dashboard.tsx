import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Scan, CheckCircle, XCircle, ArrowLeft, Users, Calendar, MapPin, Mail, Smartphone, User, Camera, Search, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import * as XLSX from "xlsx";

export default function AdminDashboard() {
  const { events, users, registrations, createEvent, scanQRCode } = useApp();
  const [activeTab, setActiveTab] = useState("events");

  // Event Creation State
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", location: "", description: "", bannerUrl: "", capacity: "" });

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; registration?: any } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Selected Event View State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent({ 
      ...newEvent, 
      status: "upcoming",
      capacity: newEvent.capacity ? parseInt(newEvent.capacity) : undefined
    });
    setShowCreateEvent(false);
    setNewEvent({ title: "", date: "", location: "", description: "", bannerUrl: "", capacity: "" });
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);
  };

  const stopScanning = () => {
     if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
     }
     setIsScanning(false);
  };

  useEffect(() => {
    if (isScanning) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
           console.log(`Scan result: ${decodedText}`);
           const result = scanQRCode(decodedText);
           setScanResult(result);
        },
        (errorMessage) => {
           // Error callback
        }
      ).catch(err => {
         console.error("Error starting scanner", err);
         setIsScanning(false);
      });
    }

    return () => {
       if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
       }
    };
  }, [isScanning, scanQRCode]);

  const handleExportExcel = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const eventRegs = registrations.filter(r => r.eventId === eventId);
    
    const data = eventRegs.map(reg => {
      const user = users.find(u => u.id === reg.userId);
      return {
        "Event": event?.title,
        "Name": user?.name,
        "Email": user?.email,
        "Mobile": user?.mobile,
        "Department": user?.department,
        "Status": reg.status.toUpperCase(),
        "Registration Date": new Date(reg.registeredAt).toLocaleDateString(),
        "Dietary": reg.additionalDetails?.dietary || "N/A",
        "T-Shirt": reg.additionalDetails?.tshirtSize || "N/A"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
    XLSX.writeFile(workbook, `${event?.title || "Event"}_Registrations.xlsx`);
  };

  // Get selected event details
  const selectedEvent = events.find(e => e.id === selectedEventId);
  
  // Get registrations for selected event
  const eventRegistrations = registrations.filter(r => r.eventId === selectedEventId);

  // Filtered Events
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If an event is selected, render the detailed view
  if (selectedEvent) {
    return (
      <div className="container mx-auto p-6 space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedEventId(null)}>
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                  <h1 className="text-2xl font-bold tracking-tight">{selectedEvent.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-4 text-sm mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(selectedEvent.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedEvent.location}</span>
                    <Badge variant={selectedEvent.status === "active" ? "default" : "secondary"}>{selectedEvent.status}</Badge>
                  </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => handleExportExcel(selectedEvent.id)}>
              <Download className="h-4 w-4 mr-2" /> Export to Excel
            </Button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1 bg-muted/20 border-muted">
               <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Registration Stats</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div>
                    <div className="text-4xl font-bold">{eventRegistrations.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total Registrations</p>
                  </div>
                  <div>
                     <div className="text-2xl font-semibold text-green-600">
                        {eventRegistrations.filter(r => r.status === "attended").length}
                     </div>
                     <p className="text-xs text-muted-foreground">Attended</p>
                  </div>
                  {selectedEvent.capacity && (
                    <div>
                       <div className="text-lg font-medium">
                          {Math.max(0, selectedEvent.capacity - eventRegistrations.length)}
                       </div>
                       <p className="text-xs text-muted-foreground">Seats Remaining</p>
                    </div>
                  )}
               </CardContent>
            </Card>

            <Card className="md:col-span-3">
               <CardHeader>
                  <CardTitle>Registered Users</CardTitle>
                  <CardDescription>Full list of attendees for this event.</CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User Details</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventRegistrations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              No registrations yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          eventRegistrations.map(reg => {
                            const user = users.find(u => u.id === reg.userId);
                            if (!user) return null;
                            return (
                              <TableRow key={reg.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium flex items-center gap-2">
                                       <User className="h-3 w-3 text-muted-foreground" /> {user.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground pl-5">@{user.username}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col text-sm space-y-1">
                                    <span className="flex items-center gap-2">
                                       <Mail className="h-3 w-3 text-muted-foreground" /> {user.email}
                                    </span>
                                    <span className="flex items-center gap-2">
                                       <Smartphone className="h-3 w-3 text-muted-foreground" /> {user.mobile}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{user.department}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{user.role}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className="transition-all duration-300"
                                    variant={reg.status === "attended" ? "default" : "secondary"}
                                  >
                                    {reg.status === "attended" ? (
                                       <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Attended</span>
                                    ) : (
                                       "Pending"
                                    )}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage events and track attendance.</p>
        </div>
        <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Add a new event to the system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Banner Image URL (Optional)</Label>
                <Input placeholder="https://..." value={newEvent.bannerUrl} onChange={e => setNewEvent({...newEvent, bannerUrl: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (Optional)</Label>
                  <Input type="number" placeholder="No Limit" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input required value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
              </div>
              <Button type="submit" className="w-full">Create Event</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
        </TabsList>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events by title or location..."
              className="pl-8 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length === 0 ? (
               <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                  <Calendar className="h-12 w-12 mb-4 opacity-20" />
                  <p>No events found.</p>
               </div>
            ) : filteredEvents.map(event => (
              <Card 
                key={event.id} 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group overflow-hidden"
                onClick={() => setSelectedEventId(event.id)}
              >
                {event.bannerUrl && (
                  <div className="h-32 w-full overflow-hidden">
                    <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">{event.title}</CardTitle>
                  <CardDescription>{new Date(event.date).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                  <div className="flex justify-between items-center text-sm mt-auto">
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{registrations.filter(r => r.eventId === event.id).length} / {event.capacity || "∞"}</span>
                     </div>
                    <Badge variant={event.status === "active" ? "default" : "outline"}>{event.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SCANNER TAB */}
        <TabsContent value="scanner">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scan className="h-5 w-5" /> Access Control</CardTitle>
              <CardDescription>Use your camera to scan attendee QR codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="aspect-video bg-black/5 rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden group min-h-[300px]">
                 {!isScanning ? (
                    <div className="text-center p-6">
                       <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                       <p className="text-muted-foreground mb-4">Camera is currently off</p>
                       <Button onClick={startScanning}>
                          Start Scanning
                       </Button>
                    </div>
                 ) : (
                    <div id="reader" className="w-full h-full bg-black"></div>
                 )}
                 
                 {isScanning && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2 z-10"
                      onClick={stopScanning}
                    >
                       Stop Camera
                    </Button>
                 )}
              </div>

              {scanResult && (
                <div className={`p-4 rounded-lg border ${scanResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {scanResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    {scanResult.success ? "ACCESS GRANTED" : "ACCESS DENIED"}
                  </div>
                  <p>{scanResult.message}</p>
                  {scanResult.registration && (
                     <div className="mt-2 text-sm opacity-90">
                       User: {users.find(u => u.id === scanResult.registration.userId)?.name} <br/>
                       Event: {events.find(e => e.id === scanResult.registration.eventId)?.title}
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
