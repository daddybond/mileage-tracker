import { classifyEvents } from './lib/classifier.js';

const mockEvents = [
  {
    id: "1",
    title: "orthadontist Millie extraction",
    description: "Appointment details",
    location: "London",
    date: "2026-03-20"
  },
  {
    id: "2",
    title: "Carl GB beds",
    description: "",
    location: "Manchester",
    date: "2026-03-18"
  }
];

async function run() {
  console.log('Testing classifyEvents...');
  const res = await classifyEvents(mockEvents, [], []);
  console.log(JSON.stringify(res, null, 2));
}
run();
