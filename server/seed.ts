import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const EventSchema = new mongoose.Schema({
  title: String,
  date: String,
  location: String,
  description: String,
  status: String,
  bannerUrl: String,
  capacity: Number,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model("Event", EventSchema);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected to MongoDB");
  
  // Clear existing events
  await Event.deleteMany({});
  
  const events = [
    {
      title: "Annual Tech Summit 2026",
      date: "2026-03-15",
      location: "Grand Hall A",
      description: "The biggest tech conference of the year featuring speakers from top tech companies.",
      status: "upcoming",
      bannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070",
      capacity: 500
    },
    {
      title: "Leadership Workshop",
      date: "2026-02-20",
      location: "Room 101",
      description: "Interactive session for team leads to develop leadership skills.",
      status: "active",
      bannerUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=2070",
      capacity: 50
    }
  ];
  
  await Event.insertMany(events);
  console.log("✅ Sample events added!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
