export type Profile = {
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  availability: string;
};

export const somNetwork: Profile[] = [
  {
    name: "Jordan Fields",
    title: "Product Lead, LinkedIn",
    gradYear: "SOM '18",
    location: "San Francisco",
    interests: ["talent marketplaces", "B2B SaaS", "mentoring pivots"],
    summary:
      "Built marketplace features connecting early-career talent to growth-stage companies. Coaches MBAs on storytelling and building warm intros.",
    availability: "Fridays 8–10a PT, virtual coffee"
  },
  {
    name: "Priya Raman",
    title: "Chief of Staff, ClimateFin",
    gradYear: "SOM '21",
    location: "New York",
    interests: ["climate finance", "policy bridges", "South Asia networks"],
    summary:
      "Coordinates partnerships between banks and climatetech startups. Knows how to translate policy nuance for investors.",
    availability: "Tues/Thu lunchtime ET, in-person Bryant Park or Zoom"
  },
  {
    name: "Miguel Alvarez",
    title: "Founder, Barrio Labs",
    gradYear: "SOM '17",
    location: "Miami",
    interests: ["community-led venture", "LatAm GTM", "no-code prototypes"],
    summary:
      "Runs a venture studio launching neighborhood-scale services. Great for advice on first pilots and getting scrappy validation.",
    availability: "Afternoons ET, prefers voice notes before calls"
  },
  {
    name: "Sara Ito",
    title: "Impact Investor, Tidal Capital",
    gradYear: "SOM '15",
    location: "Seattle",
    interests: ["education access", "workforce upskilling", "board prep"],
    summary:
      "Invests in learning platforms and vocational pathways. Deep experience preparing founders for first-time board conversations.",
    availability: "Wed mornings PT, can host intros to portfolio leaders"
  },
  {
    name: "Caleb Mensah",
    title: "Ops Director, Alpine Health",
    gradYear: "SOM '20",
    location: "Chicago",
    interests: ["health ops", "process diagnostics", "vendor sourcing"],
    summary:
      "Scaled multi-clinic operations and implemented data visibility for care teams. Helps peers map quick wins before big rollouts.",
    availability: "Early mornings CT; happy to brainstorm async"
  },
  {
    name: "Leah Osei",
    title: "VP Partnerships, Aurora Mobility",
    gradYear: "SOM '16",
    location: "London",
    interests: ["mobility ecosystems", "EU market entry", "diverse boards"],
    summary:
      "Secures city partnerships for new mobility corridors. Connects peers to operators across Europe and the Middle East.",
    availability: "Hybrid; open slots around 4–6p GMT"
  }
];
