import type { RequestStatus, ServiceKind } from "@/lib/supabase/database.types";
import {
  isServiceKind,
  needOptions,
  serviceLabels,
  serviceShortLabels,
} from "@/lib/services";

export const appName = "Haven";
export const appTagline = "Connecting people with organizations that help.";

export type NeedType = ServiceKind;
export type { RequestStatus };

export type Urgency = "today" | "this-week" | "flexible";

export const needLabels = serviceLabels;
export const needShortLabels = serviceShortLabels;

export const urgencyLabels: Record<Urgency, string> = {
  today: "Needed today",
  "this-week": "This week",
  flexible: "Flexible",
};

export const currentOrganization = {
  name: "Harbor House",
  role: "Shelter & meals",
  neighborhood: "Midtown",
  services: ["shelter", "food", "clothing"] as NeedType[],
};

export const currentParticipant = {
  firstName: "Alex",
};

export const orgStats = [
  { label: "Open beds tonight", value: "12", hint: "of 40 total" },
  { label: "Waiting to connect", value: "8", hint: "new since this morning" },
  { label: "People helped this month", value: "47", hint: "across all programs" },
  { label: "Programs near capacity", value: "3", hint: "meals, clinic, job prep" },
];

export type IncomingRequest = {
  id: string;
  name: string;
  initials: string;
  need: NeedType;
  urgency?: Urgency;
  note: string;
  waited: string;
  status: RequestStatus;
};

export const incomingRequests: IncomingRequest[] = [
  {
    id: "r1",
    name: "Jordan Miles",
    initials: "JM",
    need: "shelter",
    urgency: "today",
    note: "Looking for a bed tonight. Has a small bag and a service animal.",
    waited: "12 min ago",
    status: "pending",
  },
  {
    id: "r2",
    name: "Sam Rivera",
    initials: "SR",
    need: "food",
    urgency: "today",
    note: "Needs dinner for two. Can arrive after 6pm.",
    waited: "34 min ago",
    status: "pending",
  },
  {
    id: "r3",
    name: "Casey Nguyen",
    initials: "CN",
    need: "healthcare",
    urgency: "this-week",
    note: "Wants a walk-in clinic appointment for a persistent cough.",
    waited: "2 hours ago",
    status: "pending",
  },
  {
    id: "r4",
    name: "Riley Chen",
    initials: "RC",
    need: "work",
    urgency: "flexible",
    note: "Interested in the Tuesday job-prep workshop.",
    waited: "Yesterday",
    status: "waitlisted",
  },
];

export type Program = {
  id: string;
  name: string;
  category: NeedType;
  description: string;
  open: number;
  capacity: number;
  hours: string;
};

export const programs: Program[] = [
  {
    id: "p1",
    name: "Overnight shelter",
    category: "shelter",
    description: "Indoor beds, showers, and lockers. Check-in from 5pm.",
    open: 12,
    capacity: 40,
    hours: "5pm – 8am",
  },
  {
    id: "p2",
    name: "Community kitchen",
    category: "food",
    description: "Hot meals, no ID required. Takeaway available.",
    open: 18,
    capacity: 120,
    hours: "Lunch 11:30am, dinner 6pm",
  },
  {
    id: "p3",
    name: "Nurse clinic",
    category: "healthcare",
    description: "Basic care, wound checks, and referrals.",
    open: 4,
    capacity: 16,
    hours: "Tue & Thu 9am – 1pm",
  },
  {
    id: "p4",
    name: "Job prep workshop",
    category: "work",
    description: "Resumes, interviews, and day-labor connections.",
    open: 2,
    capacity: 12,
    hours: "Tuesdays 10am",
  },
  {
    id: "p5",
    name: "Clothing closet",
    category: "clothing",
    description: "Weather-ready clothes, shoes, and hygiene kits.",
    open: 40,
    capacity: 40,
    hours: "Weekdays 10am – 3pm",
  },
];

export type ConnectedPerson = {
  id: string;
  name: string;
  initials: string;
  program: string;
  since: string;
  nextStep: string;
};

export const connectedPeople: ConnectedPerson[] = [
  {
    id: "c1",
    name: "Morgan Ellis",
    initials: "ME",
    program: "Overnight shelter",
    since: "3 nights",
    nextStep: "Case meeting Friday",
  },
  {
    id: "c2",
    name: "Taylor Brooks",
    initials: "TB",
    program: "Community kitchen",
    since: "This week",
    nextStep: "No follow-up needed",
  },
  {
    id: "c3",
    name: "Avery Patel",
    initials: "AP",
    program: "Job prep workshop",
    since: "2 weeks",
    nextStep: "Interview practice Tue",
  },
];

export type HelpOrganization = {
  id: string;
  name: string;
  neighborhood: string;
  walkTime: string;
  services: NeedType[];
  highlight: string;
  openLabel: string;
};

export const helpOrganizations: HelpOrganization[] = [
  {
    id: "o1",
    name: "Harbor House",
    neighborhood: "Midtown",
    walkTime: "12 min walk",
    services: ["shelter", "food", "clothing"],
    highlight: "12 beds open tonight",
    openLabel: "Open now",
  },
  {
    id: "o2",
    name: "St. Martin's Kitchen",
    neighborhood: "Eastside",
    walkTime: "18 min walk",
    services: ["food"],
    highlight: "Dinner served until 7:30pm",
    openLabel: "Dinner tonight",
  },
  {
    id: "o3",
    name: "River Clinic",
    neighborhood: "Downtown",
    walkTime: "Bus 8, 15 min",
    services: ["healthcare"],
    highlight: "Walk-in hours tomorrow morning",
    openLabel: "Opens 9am",
  },
  {
    id: "o4",
    name: "WorkBridge",
    neighborhood: "Midtown",
    walkTime: "10 min walk",
    services: ["work"],
    highlight: "Workshop seats still open Tuesday",
    openLabel: "By appointment",
  },
  {
    id: "o5",
    name: "North Star Family Shelter",
    neighborhood: "West End",
    walkTime: "Bus 4, 22 min",
    services: ["shelter", "food", "healthcare"],
    highlight: "Family rooms available this week",
    openLabel: "Call ahead",
  },
];

export type ParticipantConnection = {
  id: string;
  organization: string;
  need: NeedType;
  status: RequestStatus;
  detail: string;
};

export const participantConnections: ParticipantConnection[] = [
  {
    id: "pc1",
    organization: "Harbor House",
    need: "shelter",
    status: "pending",
    detail: "They usually reply within an hour.",
  },
  {
    id: "pc2",
    organization: "St. Martin's Kitchen",
    need: "food",
    status: "accepted",
    detail: "Come by for dinner anytime before 7:30pm.",
  },
];

export { needOptions, isServiceKind as isNeedType };
