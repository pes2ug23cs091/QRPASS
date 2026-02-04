import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Calendar, Check, Copy, UserCheck, PartyPopper, Bell, Search, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function UserDashboard() {
  const { user, events, registrations, notifications, registerForEvent, cancelRegistration, markNotificationRead } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  
  // Registration Form State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [newRegistration, setNewRegistration] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form Fields
  const [formData, setFormData] = useState({
     dietary: "",
     tshirtSize: "",
     emergencyContact: "",
     organization: ""
  });

  const qrRef = useRef<SVGSVGElement>(null);

  if (!user) return <div>Access Denied</div>;

  const myRegistrations = registrations.filter(r => r.userId === user.id);
  const myEventIds = myRegistrations.map(r => r.eventId);
  
  const handleOpenRegister = (eventId: string) => {
    const alreadyRegistered = myEventIds.includes(eventId);
    if (alreadyRegistered) {
       toast({ title: "Already Registered", description: "Check your passes tab." });
       return;
    }
    setSelectedEventId(eventId);
    setFormData({ dietary: "", tshirtSize: "", emergencyContact: "", organization: "" });
    setIsRegModalOpen(true);
  };

  const handleConfirmRegister = () => {
     if (!selectedEventId) return;

     const reg = registerForEvent(selectedEventId, formData);
     if (reg) {
        setNewRegistration(reg);
        setIsRegModalOpen(false);
        setSuccessModalOpen(true); // Show success popup immediately
        toast({ title: "Registration Successful!", description: "Your pass has been generated." });
     }
  };

  const handleCancelRegistration = (regId: string) => {
    if (confirm("Are you sure you want to cancel this registration? This action cannot be undone.")) {
      cancelRegistration(regId);
    }
  };

  const downloadQRCode = (qrCodeData: string, eventTitle: string) => {
    const canvas = document.createElement("canvas");
    const svg = document.getElementById(`qr-${qrCodeData}`);
    
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    
    img.onload = () => {
       canvas.width = img.width + 40;
       canvas.height = img.height + 40;
       const ctx = canvas.getContext("2d");
       if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          
          const a = document.createElement("a");
          a.download = `Pass-${eventTitle}.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
       }
    };
  };

  // Filter Events
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.name}</h1>
          <p className="text-muted-foreground">Manage your event passes and discover new events.</p>
        </div>
        
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <h3 className="font-semibold mb-2">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-md text-sm cursor-pointer ${notif.read ? 'bg-muted/50' : 'bg-blue-50/50 border-l-2 border-blue-500'}`}
                    onClick={() => markNotificationRead(notif.id)}
                  >
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-muted-foreground text-xs">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Events</TabsTrigger>
          <TabsTrigger value="passes">My Passes ({myRegistrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="relative mb-6">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              className="pl-8 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                No events found matching your search.
              </div>
            ) : (
              filteredEvents.map(event => {
                const isRegistered = myEventIds.includes(event.id);
                const currentRegCount = registrations.filter(r => r.eventId === event.id).length;
                const capacity = event.capacity;
                const isFull = capacity && currentRegCount >= capacity;

                return (
                  <Card key={event.id} className={`flex flex-col overflow-hidden ${isRegistered ? 'border-primary/20 bg-primary/5' : ''}`}>
                    {event.bannerUrl && (
                       <div className="h-32 w-full overflow-hidden">
                          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                       </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <Badge variant="outline">{event.status}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> {new Date(event.date).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{event.description}</p>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {event.location}</span>
                        {capacity && (
                           <span className={`text-xs ${isFull ? 'text-red-500 font-bold' : ''}`}>
                              {isFull ? 'Sold Out' : `${capacity - currentRegCount} spots left`}
                           </span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      {isRegistered ? (
                         <Button variant="outline" className="w-full border-primary/50 text-primary" onClick={() => setActiveTab("passes")}>
                            <UserCheck className="mr-2 h-4 w-4" /> Registered
                         </Button>
                      ) : (
                         <Button className="w-full" onClick={() => handleOpenRegister(event.id)} disabled={isFull || false}>
                            {isFull ? "Event Full" : "Register Now"}
                         </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="passes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myRegistrations.length === 0 ? (
               <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                  You haven't registered for any events yet.
               </div>
            ) : (
               events.filter(e => myEventIds.includes(e.id)).map(event => {
                 const reg = myRegistrations.find(r => r.eventId === event.id);
                 if (!reg) return null;
   
                 return (
                   <Card key={event.id} className="overflow-hidden border-l-4 border-l-primary">
                     <div className="md:flex h-full">
                       <div className="p-6 flex-1 space-y-4">
                         <div className="flex justify-between items-start">
                           <div>
                              <Badge variant={reg.status === "attended" ? "secondary" : "default"} className="mb-2">
                                 {reg.status === "attended" ? "ATTENDED" : "VALID PASS"}
                              </Badge>
                              <h3 className="text-xl font-bold">{event.title}</h3>
                           </div>
                           {reg.status !== "attended" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive h-8 w-8" 
                                title="Cancel Registration"
                                onClick={() => handleCancelRegistration(reg.id)}
                              >
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           )}
                         </div>
                         <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString()}
                              <span className="text-border">|</span>
                              <MapPin className="h-4 w-4" /> {event.location}
                         </p>
                         
                         <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-md">
                           <div>
                             <span className="text-xs text-muted-foreground block">Name</span>
                             <span className="font-medium">{user.name}</span>
                           </div>
                           <div>
                             <span className="text-xs text-muted-foreground block">Registration ID</span>
                             <span className="font-mono text-xs">{reg.id}</span>
                           </div>
                           {reg.additionalDetails?.tshirtSize && (
                              <div>
                                 <span className="text-xs text-muted-foreground block">Size</span>
                                 <span className="font-medium">{reg.additionalDetails.tshirtSize}</span>
                              </div>
                           )}
                           {reg.additionalDetails?.dietary && (
                              <div>
                                 <span className="text-xs text-muted-foreground block">Dietary</span>
                                 <span className="font-medium truncate">{reg.additionalDetails.dietary}</span>
                              </div>
                           )}
                         </div>
                       </div>
   
                       <div className="bg-white p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border min-w-[200px]">
                         <div className="bg-white p-2 rounded shadow-sm border">
                           <QRCodeSVG 
                              id={`qr-${reg.qrCodeData}`}
                              value={reg.qrCodeData} 
                              size={140} 
                           />
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-2 text-center uppercase tracking-wider">
                           Scan at entry
                         </p>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="mt-3 text-xs w-full"
                           onClick={() => downloadQRCode(reg.qrCodeData, event.title)}
                         >
                           <Download className="h-3 w-3 mr-1" /> Download
                         </Button>
                       </div>
                     </div>
                   </Card>
                 );
               })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Registration Details Modal */}
      <Dialog open={isRegModalOpen} onOpenChange={setIsRegModalOpen}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle>Complete Registration</DialogTitle>
               <DialogDescription>
                  Please provide a few more details to finalize your registration.
               </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="org" className="text-right">Organization</Label>
                  <Input 
                     id="org" 
                     className="col-span-3" 
                     placeholder="Company or University"
                     value={formData.organization}
                     onChange={e => setFormData({...formData, organization: e.target.value})}
                  />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact" className="text-right">Emergency</Label>
                  <Input 
                     id="contact" 
                     className="col-span-3" 
                     placeholder="Emergency Contact Name/Phone"
                     value={formData.emergencyContact}
                     onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                  />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tshirt" className="text-right">T-Shirt Size</Label>
                  <Select onValueChange={(v) => setFormData({...formData, tshirtSize: v})}>
                     <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a size" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="XXL">XXL</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dietary" className="text-right">Dietary</Label>
                  <Textarea 
                     id="dietary" 
                     className="col-span-3" 
                     placeholder="Any allergies or restrictions?"
                     value={formData.dietary}
                     onChange={e => setFormData({...formData, dietary: e.target.value})}
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsRegModalOpen(false)}>Cancel</Button>
               <Button onClick={handleConfirmRegister}>Confirm & Get Pass</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Instant Success Modal with QR */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
         <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
               <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                  <PartyPopper className="h-8 w-8 text-green-600" />
               </div>
               <DialogTitle className="text-center text-xl">You're Registered!</DialogTitle>
               <DialogDescription className="text-center">
                  Your registration is confirmed. Here is your access pass.
               </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed my-2">
               {newRegistration && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                     <QRCodeSVG value={newRegistration.qrCodeData} size={180} />
                  </div>
               )}
               <p className="text-sm text-muted-foreground mt-4 font-medium">Scan this code at the event entrance.</p>
            </div>

            <DialogFooter className="sm:justify-center">
               <Button className="w-full" onClick={() => setSuccessModalOpen(false)}>
                  Close
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
