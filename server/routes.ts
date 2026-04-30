// // // //server/routes.ts - FIXED VERSION


// // import type { Express, Request, Response } from "express";
// // import { createServer, type Server } from "node:http";
// // import { storage } from "./storage";
// // import { setupSocketIO } from "./socket";
// // import { createPaymentIntent, createCustomer, confirmPayment } from "./stripe";
// // import { insertUserSchema, insertRideSchema, insertDriverSchema } from "@shared/schema";

// // export async function registerRoutes(app: Express): Promise<Server> {
// //   const httpServer = createServer(app);
// //   const io = setupSocketIO(httpServer);

// //   app.post("/api/auth/register", async (req: Request, res: Response) => {
// //     try {
// //       const parsed = insertUserSchema.safeParse(req.body);
// //       if (!parsed.success) {
// //         return res.status(400).json({ error: parsed.error.message });
// //       }

// //       const existingUser = await storage.getUserByEmail(parsed.data.email);
// //       if (existingUser) {
// //         return res.status(409).json({ error: "User already exists" });
// //       }

// //       const user = await storage.createUser(parsed.data);

// //       let stripeCustomerId = null;
// //       try {
// //         stripeCustomerId = await createCustomer(user.email, user.fullName);
// //         if (stripeCustomerId) {
// //           await storage.updateUser(user.id, { stripeCustomerId });
// //         }
// //       } catch (e) {
// //         console.warn("Failed to create Stripe customer:", e);
// //       }

// //       res.status(201).json({ user: { ...user, stripeCustomerId } });
// //     } catch (error) {
// //       console.error("Registration error:", error);
// //       res.status(500).json({ error: "Failed to register user" });
// //     }
// //   });

// //   app.post("/api/auth/login", async (req: Request, res: Response) => {
// //     try {
// //       const { email, password } = req.body;

// //       if (!email) {
// //         return res.status(400).json({ error: "Email is required" });
// //       }

// //       const user = await storage.getUserByEmail(email);
// //       if (!user) {
// //         return res.status(401).json({ error: "Invalid credentials" });
// //       }

// //       res.json({ user });
// //     } catch (error) {
// //       console.error("Login error:", error);
// //       res.status(500).json({ error: "Failed to login" });
// //     }
// //   });

// //   app.get("/api/users/:id", async (req: Request, res: Response) => {
// //     try {
// //       const user = await storage.getUser(req.params.id);
// //       if (!user) {
// //         return res.status(404).json({ error: "User not found" });
// //       }
// //       res.json({ user });
// //     } catch (error) {
// //       console.error("Get user error:", error);
// //       res.status(500).json({ error: "Failed to get user" });
// //     }
// //   });

// //   app.put("/api/users/:id", async (req: Request, res: Response) => {
// //     try {
// //       const user = await storage.updateUser(req.params.id, req.body);
// //       if (!user) {
// //         return res.status(404).json({ error: "User not found" });
// //       }
// //       res.json({ user });
// //     } catch (error) {
// //       console.error("Update user error:", error);
// //       res.status(500).json({ error: "Failed to update user" });
// //     }
// //   });

// //   app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
// //     try {
// //       const { pushToken } = req.body;
// //       const user = await storage.updateUser(req.params.id, { pushToken });
// //       if (!user) {
// //         return res.status(404).json({ error: "User not found" });
// //       }
// //       res.json({ success: true });
// //     } catch (error) {
// //       console.error("Update push token error:", error);
// //       res.status(500).json({ error: "Failed to update push token" });
// //     }
// //   });

// //   app.post("/api/drivers", async (req: Request, res: Response) => {
// //     try {
// //       const parsed = insertDriverSchema.safeParse(req.body);
// //       if (!parsed.success) {
// //         return res.status(400).json({ error: parsed.error.message });
// //       }

// //       const driver = await storage.createDriver(parsed.data);
// //       res.status(201).json({ driver });
// //     } catch (error) {
// //       console.error("Create driver error:", error);
// //       res.status(500).json({ error: "Failed to create driver" });
// //     }
// //   });

// //   app.get("/api/drivers/online", async (req: Request, res: Response) => {
// //     try {
// //       const onlineDrivers = await storage.getOnlineDrivers();
// //       res.json({ drivers: onlineDrivers });
// //     } catch (error) {
// //       console.error("Get online drivers error:", error);
// //       res.status(500).json({ error: "Failed to get online drivers" });
// //     }
// //   });

// //   app.get("/api/drivers/:id", async (req: Request, res: Response) => {
// //     try {
// //       const driver = await storage.getDriver(req.params.id);
// //       if (!driver) {
// //         return res.status(404).json({ error: "Driver not found" });
// //       }
// //       res.json({ driver });
// //     } catch (error) {
// //       console.error("Get driver error:", error);
// //       res.status(500).json({ error: "Failed to get driver" });
// //     }
// //   });

// //   app.get("/api/drivers/user/:userId", async (req: Request, res: Response) => {
// //     try {
// //       const driver = await storage.getDriverByUserId(req.params.userId);
// //       if (!driver) {
// //         return res.status(404).json({ error: "Driver not found" });
// //       }
// //       res.json({ driver });
// //     } catch (error) {
// //       console.error("Get driver by user error:", error);
// //       res.status(500).json({ error: "Failed to get driver" });
// //     }
// //   });

// //   app.put("/api/drivers/:id", async (req: Request, res: Response) => {
// //     try {
// //       const driver = await storage.updateDriver(req.params.id, req.body);
// //       if (!driver) {
// //         return res.status(404).json({ error: "Driver not found" });
// //       }
// //       res.json({ driver });
// //     } catch (error) {
// //       console.error("Update driver error:", error);
// //       res.status(500).json({ error: "Failed to update driver" });
// //     }
// //   });

// //   app.post("/api/rides", async (req: Request, res: Response) => {
// //     try {
// //       const parsed = insertRideSchema.safeParse(req.body);
// //       if (!parsed.success) {
// //         return res.status(400).json({ error: parsed.error.message });
// //       }

// //       const ride = await storage.createRide(parsed.data);

// //       io.emit("ride:new", ride);

// //       res.status(201).json({ ride });
// //     } catch (error) {
// //       console.error("Create ride error:", error);
// //       res.status(500).json({ error: "Failed to create ride" });
// //     }
// //   });

// //   app.get("/api/rides/:id", async (req: Request, res: Response) => {
// //     try {
// //       const ride = await storage.getRide(req.params.id);
// //       if (!ride) {
// //         return res.status(404).json({ error: "Ride not found" });
// //       }
// //       res.json({ ride });
// //     } catch (error) {
// //       console.error("Get ride error:", error);
// //       res.status(500).json({ error: "Failed to get ride" });
// //     }
// //   });

// //   app.get("/api/rides/rider/:riderId", async (req: Request, res: Response) => {
// //     try {
// //       const rides = await storage.getRidesByRider(req.params.riderId);
// //       res.json({ rides });
// //     } catch (error) {
// //       console.error("Get rider rides error:", error);
// //       res.status(500).json({ error: "Failed to get rides" });
// //     }
// //   });

// //   app.get("/api/rides/driver/:driverId", async (req: Request, res: Response) => {
// //     try {
// //       const rides = await storage.getRidesByDriver(req.params.driverId);
// //       res.json({ rides });
// //     } catch (error) {
// //       console.error("Get driver rides error:", error);
// //       res.status(500).json({ error: "Failed to get rides" });
// //     }
// //   });

// //   app.put("/api/rides/:id", async (req: Request, res: Response) => {
// //     try {
// //       const ride = await storage.updateRide(req.params.id, req.body);
// //       if (!ride) {
// //         return res.status(404).json({ error: "Ride not found" });
// //       }

// //       io.to(`rider:${ride.riderId}`).emit("ride:update", ride);
// //       if (ride.driverId) {
// //         io.to(`driver:${ride.driverId}`).emit("ride:update", ride);
// //       }

// //       res.json({ ride });
// //     } catch (error) {
// //       console.error("Update ride error:", error);
// //       res.status(500).json({ error: "Failed to update ride" });
// //     }
// //   });

// //   app.post("/api/payments/create-intent", async (req: Request, res: Response) => {
// //     try {
// //       const { amount, customerId } = req.body;

// //       if (!amount || amount <= 0) {
// //         return res.status(400).json({ error: "Invalid amount" });
// //       }

// //       const result = await createPaymentIntent(amount, "gbp", customerId);
// //       if (!result) {
// //         return res.status(500).json({ error: "Failed to create payment intent" });
// //       }

// //       res.json(result);
// //     } catch (error) {
// //       console.error("Create payment intent error:", error);
// //       res.status(500).json({ error: "Failed to create payment intent" });
// //     }
// //   });

// //   app.post("/api/payments/confirm", async (req: Request, res: Response) => {
// //     try {
// //       const { paymentIntentId, rideId, userId, amount } = req.body;

// //       const success = await confirmPayment(paymentIntentId);

// //       if (success) {
// //         await storage.createPayment({
// //           rideId,
// //           userId,
// //           amount,
// //           currency: "gbp",
// //           status: "succeeded",
// //           stripePaymentIntentId: paymentIntentId,
// //           paymentMethod: "card",
// //         });

// //         await storage.updateRide(rideId, {
// //           paymentStatus: "paid",
// //           paymentIntentId,
// //         });
// //       }

// //       res.json({ success });
// //     } catch (error) {
// //       console.error("Confirm payment error:", error);
// //       res.status(500).json({ error: "Failed to confirm payment" });
// //     }
// //   });

// //   app.get("/api/places/saved/:userId", async (req: Request, res: Response) => {
// //     try {
// //       const places = await storage.getSavedPlaces(req.params.userId);
// //       res.json({ places });
// //     } catch (error) {
// //       console.error("Get saved places error:", error);
// //       res.status(500).json({ error: "Failed to get saved places" });
// //     }
// //   });

// //   app.post("/api/places/saved", async (req: Request, res: Response) => {
// //     try {
// //       const place = await storage.createSavedPlace(req.body);
// //       res.status(201).json({ place });
// //     } catch (error) {
// //       console.error("Create saved place error:", error);
// //       res.status(500).json({ error: "Failed to create saved place" });
// //     }
// //   });

// //   app.delete("/api/places/saved/:id", async (req: Request, res: Response) => {
// //     try {
// //       await storage.deleteSavedPlace(req.params.id);
// //       res.json({ success: true });
// //     } catch (error) {
// //       console.error("Delete saved place error:", error);
// //       res.status(500).json({ error: "Failed to delete saved place" });
// //     }
// //   });

// //   app.get("/api/places/autocomplete", async (req: Request, res: Response) => {
// //     try {
// //       const { input, sessiontoken } = req.query;

// //       if (!input) {
// //         return res.status(400).json({ error: "Input is required" });
// //       }

// //       if (!process.env.GOOGLE_PLACES_API_KEY) {
// //         return res.json({
// //           predictions: [
// //             {
// //               place_id: "1",
// //               description: "London, UK",
// //               structured_formatting: { main_text: "London", secondary_text: "UK" },
// //             },
// //             {
// //               place_id: "2",
// //               description: "Manchester, UK",
// //               structured_formatting: { main_text: "Manchester", secondary_text: "UK" },
// //             },
// //             {
// //               place_id: "3",
// //               description: "Birmingham, UK",
// //               structured_formatting: { main_text: "Birmingham", secondary_text: "UK" },
// //             },
// //           ],
// //         });
// //       }

// //       const response = await fetch(
// //         `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
// //           input as string
// //         )}&key=${process.env.GOOGLE_PLACES_API_KEY}&components=country:gb&sessiontoken=${sessiontoken || ""}`
// //       );

// //       const data = await response.json();
// //       res.json(data);
// //     } catch (error) {
// //       console.error("Places autocomplete error:", error);
// //       res.status(500).json({ error: "Failed to get autocomplete results" });
// //     }
// //   });

// //   app.get("/api/places/details/:placeId", async (req: Request, res: Response) => {
// //     try {
// //       const { placeId } = req.params;

// //       if (!process.env.GOOGLE_PLACES_API_KEY) {
// //         return res.json({
// //           result: {
// //             geometry: {
// //               location: { lat: 51.5074, lng: -0.1278 },
// //             },
// //             formatted_address: "London, UK",
// //           },
// //         });
// //       }

// //       const response = await fetch(
// //         `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${process.env.GOOGLE_PLACES_API_KEY}`
// //       );

// //       const data = await response.json();
// //       res.json(data);
// //     } catch (error) {
// //       console.error("Places details error:", error);
// //       res.status(500).json({ error: "Failed to get place details" });
// //     }
// //   });

// //   // Google Directions API for route polylines
// //   app.get("/api/directions", async (req: Request, res: Response) => {
// //     try {
// //       const { origin, destination, waypoints } = req.query;

// //       if (!origin || !destination) {
// //         return res.status(400).json({ error: "Origin and destination are required" });
// //       }

// //       const generateMockRoute = () => {
// //         const originCoords = (origin as string).split(",").map(Number);
// //         const destCoords = (destination as string).split(",").map(Number);

// //         const latDiff = destCoords[0] - originCoords[0];
// //         const lngDiff = destCoords[1] - originCoords[1];
// //         const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
// //         const distanceMeters = Math.round(distance * 1000);
// //         const durationSeconds = Math.round(distance * 120);

// //         const points: { latitude: number; longitude: number }[] = [];
// //         const steps = 20;
// //         for (let i = 0; i <= steps; i++) {
// //           const t = i / steps;
// //           const midOffset = Math.sin(t * Math.PI) * 0.002;
// //           points.push({
// //             latitude: originCoords[0] + latDiff * t + midOffset * (lngDiff > 0 ? 1 : -1),
// //             longitude: originCoords[1] + lngDiff * t + midOffset * (latDiff > 0 ? -1 : 1),
// //           });
// //         }

// //         return {
// //           routes: [{
// //             overview_polyline: { points: "" },
// //             legs: [{
// //               distance: { text: `${(distance).toFixed(1)} km`, value: distanceMeters },
// //               duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds },
// //               start_location: { lat: originCoords[0], lng: originCoords[1] },
// //               end_location: { lat: destCoords[0], lng: destCoords[1] },
// //             }],
// //             decodedPolyline: points,
// //           }],
// //           status: "OK",
// //         };
// //       };

// //       if (!process.env.GOOGLE_PLACES_API_KEY) {
// //         return res.json(generateMockRoute());
// //       }

// //       let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
// //         origin as string
// //       )}&destination=${encodeURIComponent(
// //         destination as string
// //       )}&key=${process.env.GOOGLE_PLACES_API_KEY}&mode=driving`;

// //       if (waypoints) {
// //         url += `&waypoints=${encodeURIComponent(waypoints as string)}`;
// //       }

// //       const response = await fetch(url);
// //       const data = await response.json();

// //       if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
// //         console.log("Google Directions API returned non-OK status:", data.status, "- falling back to mock route");
// //         return res.json(generateMockRoute());
// //       }

// //       if (data.routes[0].overview_polyline) {
// //         const encoded = data.routes[0].overview_polyline.points;
// //         data.routes[0].decodedPolyline = decodePolyline(encoded);
// //       }

// //       res.json(data);
// //     } catch (error) {
// //       console.error("Directions error:", error);
// //       res.status(500).json({ error: "Failed to get directions" });
// //     }
// //   });

// //   return httpServer;
// // }

// // // Decode Google's encoded polyline format
// // function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
// //   const points: { latitude: number; longitude: number }[] = [];
// //   let index = 0;
// //   let lat = 0;
// //   let lng = 0;

// //   while (index < encoded.length) {
// //     let b;
// //     let shift = 0;
// //     let result = 0;

// //     do {
// //       b = encoded.charCodeAt(index++) - 63;
// //       result |= (b & 0x1f) << shift;
// //       shift += 5;
// //     } while (b >= 0x20);

// //     const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
// //     lat += dlat;

// //     shift = 0;
// //     result = 0;

// //     do {
// //       b = encoded.charCodeAt(index++) - 63;
// //       result |= (b & 0x1f) << shift;
// //       shift += 5;
// //     } while (b >= 0x20);

// //     const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
// //     lng += dlng;

// //     points.push({
// //       latitude: lat / 1e5,
// //       longitude: lng / 1e5,
// //     });
// //   }

// //   return points;
// // }

// import type { Express, Request, Response } from "express";
// import { createServer, type Server } from "node:http";
// import { storage } from "./storage";
// import { setupSocketIO } from "./socket";
// import { createPaymentIntent, createCustomer, confirmPayment } from "./stripe";
// import { insertUserSchema, insertRideSchema, insertDriverSchema } from "@shared/schema";

// export async function registerRoutes(app: Express): Promise<Server> {
//   const httpServer = createServer(app);
//   const io = setupSocketIO(httpServer);

//   app.post("/api/auth/register", async (req: Request, res: Response) => {
//     try {
//       const parsed = insertUserSchema.safeParse(req.body);
//       if (!parsed.success) {
//         return res.status(400).json({ error: parsed.error.message });
//       }

//       const existingUser = await storage.getUserByEmail(parsed.data.email);
//       if (existingUser) {
//         return res.status(409).json({ error: "User already exists" });
//       }

//       const user = await storage.createUser(parsed.data);

//       let stripeCustomerId = null;
//       try {
//         stripeCustomerId = await createCustomer(user.email, user.fullName);
//         if (stripeCustomerId) {
//           await storage.updateUser(user.id, { stripeCustomerId });
//         }
//       } catch (e) {
//         console.warn("Failed to create Stripe customer:", e);
//       }

//       res.status(201).json({ user: { ...user, stripeCustomerId } });
//     } catch (error) {
//       console.error("Registration error:", error);
//       res.status(500).json({ error: "Failed to register user" });
//     }
//   });

//   app.post("/api/auth/login", async (req: Request, res: Response) => {
//     try {
//       const { email, password } = req.body;

//       if (!email) {
//         return res.status(400).json({ error: "Email is required" });
//       }

//       const user = await storage.getUserByEmail(email);
//       if (!user) {
//         return res.status(401).json({ error: "Invalid credentials" });
//       }

//       res.json({ user });
//     } catch (error) {
//       console.error("Login error:", error);
//       res.status(500).json({ error: "Failed to login" });
//     }
//   });

//   app.get("/api/users/:id", async (req: Request, res: Response) => {
//     try {
//       const user = await storage.getUser(req.params.id);
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
//       res.json({ user });
//     } catch (error) {
//       console.error("Get user error:", error);
//       res.status(500).json({ error: "Failed to get user" });
//     }
//   });

//   app.put("/api/users/:id", async (req: Request, res: Response) => {
//     try {
//       const user = await storage.updateUser(req.params.id, req.body);
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
//       res.json({ user });
//     } catch (error) {
//       console.error("Update user error:", error);
//       res.status(500).json({ error: "Failed to update user" });
//     }
//   });

//   app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
//     try {
//       const { pushToken } = req.body;
//       const user = await storage.updateUser(req.params.id, { pushToken });
//       if (!user) {
//         return res.status(404).json({ error: "User not found" });
//       }
//       res.json({ success: true });
//     } catch (error) {
//       console.error("Update push token error:", error);
//       res.status(500).json({ error: "Failed to update push token" });
//     }
//   });

//   app.post("/api/drivers", async (req: Request, res: Response) => {
//     try {
//       const parsed = insertDriverSchema.safeParse(req.body);
//       if (!parsed.success) {
//         return res.status(400).json({ error: parsed.error.message });
//       }

//       const driver = await storage.createDriver(parsed.data);
//       res.status(201).json({ driver });
//     } catch (error) {
//       console.error("Create driver error:", error);
//       res.status(500).json({ error: "Failed to create driver" });
//     }
//   });

//   app.get("/api/drivers/online", async (req: Request, res: Response) => {
//     try {
//       const onlineDrivers = await storage.getOnlineDrivers();
//       res.json({ drivers: onlineDrivers });
//     } catch (error) {
//       console.error("Get online drivers error:", error);
//       res.status(500).json({ error: "Failed to get online drivers" });
//     }
//   });

//   app.get("/api/drivers/:id", async (req: Request, res: Response) => {
//     try {
//       const driver = await storage.getDriver(req.params.id);
//       if (!driver) {
//         return res.status(404).json({ error: "Driver not found" });
//       }
//       res.json({ driver });
//     } catch (error) {
//       console.error("Get driver error:", error);
//       res.status(500).json({ error: "Failed to get driver" });
//     }
//   });

//   app.get("/api/drivers/user/:userId", async (req: Request, res: Response) => {
//     try {
//       const driver = await storage.getDriverByUserId(req.params.userId);
//       if (!driver) {
//         return res.status(404).json({ error: "Driver not found" });
//       }
//       res.json({ driver });
//     } catch (error) {
//       console.error("Get driver by user error:", error);
//       res.status(500).json({ error: "Failed to get driver" });
//     }
//   });

//   app.put("/api/drivers/:id", async (req: Request, res: Response) => {
//     try {
//       const driver = await storage.updateDriver(req.params.id, req.body);
//       if (!driver) {
//         return res.status(404).json({ error: "Driver not found" });
//       }
//       res.json({ driver });
//     } catch (error) {
//       console.error("Update driver error:", error);
//       res.status(500).json({ error: "Failed to update driver" });
//     }
//   });

//   app.post("/api/rides", async (req: Request, res: Response) => {
//     try {
//       const parsed = insertRideSchema.safeParse(req.body);
//       if (!parsed.success) {
//         return res.status(400).json({ error: parsed.error.message });
//       }

//       const ride = await storage.createRide(parsed.data);

//       io.emit("ride:new", ride);

//       res.status(201).json({ ride });
//     } catch (error) {
//       console.error("Create ride error:", error);
//       res.status(500).json({ error: "Failed to create ride" });
//     }
//   });

//   app.get("/api/rides/:id", async (req: Request, res: Response) => {
//     try {
//       const ride = await storage.getRide(req.params.id);
//       if (!ride) {
//         return res.status(404).json({ error: "Ride not found" });
//       }
//       res.json({ ride });
//     } catch (error) {
//       console.error("Get ride error:", error);
//       res.status(500).json({ error: "Failed to get ride" });
//     }
//   });

//   app.get("/api/rides/rider/:riderId", async (req: Request, res: Response) => {
//     try {
//       const rides = await storage.getRidesByRider(req.params.riderId);
//       res.json({ rides });
//     } catch (error) {
//       console.error("Get rider rides error:", error);
//       res.status(500).json({ error: "Failed to get rides" });
//     }
//   });

//   app.get("/api/rides/driver/:driverId", async (req: Request, res: Response) => {
//     try {
//       const rides = await storage.getRidesByDriver(req.params.driverId);
//       res.json({ rides });
//     } catch (error) {
//       console.error("Get driver rides error:", error);
//       res.status(500).json({ error: "Failed to get rides" });
//     }
//   });

//   app.put("/api/rides/:id", async (req: Request, res: Response) => {
//     try {
//       const ride = await storage.updateRide(req.params.id, req.body);
//       if (!ride) {
//         return res.status(404).json({ error: "Ride not found" });
//       }

//       io.to(`rider:${ride.riderId}`).emit("ride:update", ride);
//       if (ride.driverId) {
//         io.to(`driver:${ride.driverId}`).emit("ride:update", ride);
//       }

//       res.json({ ride });
//     } catch (error) {
//       console.error("Update ride error:", error);
//       res.status(500).json({ error: "Failed to update ride" });
//     }
//   });

//   app.post("/api/payments/create-intent", async (req: Request, res: Response) => {
//     try {
//       const { amount, customerId } = req.body;

//       if (!amount || amount <= 0) {
//         return res.status(400).json({ error: "Invalid amount" });
//       }

//       const result = await createPaymentIntent(amount, "gbp", customerId);
//       if (!result) {
//         return res.status(500).json({ error: "Failed to create payment intent" });
//       }

//       res.json(result);
//     } catch (error) {
//       console.error("Create payment intent error:", error);
//       res.status(500).json({ error: "Failed to create payment intent" });
//     }
//   });

//   app.post("/api/payments/confirm", async (req: Request, res: Response) => {
//     try {
//       const { paymentIntentId, rideId, userId, amount } = req.body;

//       const success = await confirmPayment(paymentIntentId);

//       if (success) {
//         await storage.createPayment({
//           rideId,
//           userId,
//           amount,
//           currency: "gbp",
//           status: "succeeded",
//           stripePaymentIntentId: paymentIntentId,
//           paymentMethod: "card",
//         });

//         await storage.updateRide(rideId, {
//           paymentStatus: "paid",
//           paymentIntentId,
//         });
//       }

//       res.json({ success });
//     } catch (error) {
//       console.error("Confirm payment error:", error);
//       res.status(500).json({ error: "Failed to confirm payment" });
//     }
//   });

//   app.get("/api/places/saved/:userId", async (req: Request, res: Response) => {
//     try {
//       const places = await storage.getSavedPlaces(req.params.userId);
//       res.json({ places });
//     } catch (error) {
//       console.error("Get saved places error:", error);
//       res.status(500).json({ error: "Failed to get saved places" });
//     }
//   });

//   app.post("/api/places/saved", async (req: Request, res: Response) => {
//     try {
//       const place = await storage.createSavedPlace(req.body);
//       res.status(201).json({ place });
//     } catch (error) {
//       console.error("Create saved place error:", error);
//       res.status(500).json({ error: "Failed to create saved place" });
//     }
//   });

//   app.delete("/api/places/saved/:id", async (req: Request, res: Response) => {
//     try {
//       await storage.deleteSavedPlace(req.params.id);
//       res.json({ success: true });
//     } catch (error) {
//       console.error("Delete saved place error:", error);
//       res.status(500).json({ error: "Failed to delete saved place" });
//     }
//   });

//   app.get("/api/places/autocomplete", async (req: Request, res: Response) => {
//     try {
//       const { input, sessiontoken } = req.query;

//       if (!input) {
//         return res.status(400).json({ error: "Input is required" });
//       }

//       if (!process.env.GOOGLE_PLACES_API_KEY) {
//         return res.json({
//           predictions: [
//             {
//               place_id: "1",
//               description: "London, UK",
//               structured_formatting: { main_text: "London", secondary_text: "UK" },
//             },
//             {
//               place_id: "2",
//               description: "Manchester, UK",
//               structured_formatting: { main_text: "Manchester", secondary_text: "UK" },
//             },
//             {
//               place_id: "3",
//               description: "Birmingham, UK",
//               structured_formatting: { main_text: "Birmingham", secondary_text: "UK" },
//             },
//           ],
//         });
//       }

//       const response = await fetch(
//         `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
//           input as string
//         )}&key=${process.env.GOOGLE_PLACES_API_KEY}&components=country:gb&sessiontoken=${sessiontoken || ""}`
//       );

//       const data = await response.json();
//       res.json(data);
//     } catch (error) {
//       console.error("Places autocomplete error:", error);
//       res.status(500).json({ error: "Failed to get autocomplete results" });
//     }
//   });

//   app.get("/api/places/details/:placeId", async (req: Request, res: Response) => {
//     try {
//       const { placeId } = req.params;

//       if (!process.env.GOOGLE_PLACES_API_KEY) {
//         return res.json({
//           result: {
//             geometry: {
//               location: { lat: 51.5074, lng: -0.1278 },
//             },
//             formatted_address: "London, UK",
//           },
//         });
//       }

//       const response = await fetch(
//         `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${process.env.GOOGLE_PLACES_API_KEY}`
//       );

//       const data = await response.json();
//       res.json(data);
//     } catch (error) {
//       console.error("Places details error:", error);
//       res.status(500).json({ error: "Failed to get place details" });
//     }
//   });

//   // Google Directions API for route polylines
//   app.get("/api/directions", async (req: Request, res: Response) => {
//     try {
//       const { origin, destination, waypoints } = req.query;

//       if (!origin || !destination) {
//         return res.status(400).json({ error: "Origin and destination are required" });
//       }

//       const generateMockRoute = () => {
//         const originCoords = (origin as string).split(",").map(Number);
//         const destCoords = (destination as string).split(",").map(Number);

//         const latDiff = destCoords[0] - originCoords[0];
//         const lngDiff = destCoords[1] - originCoords[1];
//         // roughly distance in km
//         const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
//         const distanceMiles = distanceKm * 0.621371;
//         const distanceMeters = Math.round(distanceKm * 1000);
//         const durationSeconds = Math.round(distanceKm * 120);

//         const points: { latitude: number; longitude: number }[] = [];
//         const steps = 20;
//         for (let i = 0; i <= steps; i++) {
//           const t = i / steps;
//           const midOffset = Math.sin(t * Math.PI) * 0.002;
//           points.push({
//             latitude: originCoords[0] + latDiff * t + midOffset * (lngDiff > 0 ? 1 : -1),
//             longitude: originCoords[1] + lngDiff * t + midOffset * (latDiff > 0 ? -1 : 1),
//           });
//         }

//         return {
//           routes: [{
//             overview_polyline: { points: "" },
//             legs: [{
//               distance: { text: `${(distanceMiles).toFixed(1)} mi`, value: distanceMeters },
//               duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds },
//               start_location: { lat: originCoords[0], lng: originCoords[1] },
//               end_location: { lat: destCoords[0], lng: destCoords[1] },
//             }],
//             decodedPolyline: points,
//           }],
//           status: "OK",
//         };
//       };

//       if (!process.env.GOOGLE_PLACES_API_KEY) {
//         return res.json(generateMockRoute());
//       }

//       let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
//         origin as string
//       )}&destination=${encodeURIComponent(
//         destination as string
//       )}&key=${process.env.GOOGLE_PLACES_API_KEY}&mode=driving`;

//       if (waypoints) {
//         url += `&waypoints=${encodeURIComponent(waypoints as string)}`;
//       }

//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
//         console.log("Google Directions API returned non-OK status:", data.status, "- falling back to mock route");
//         return res.json(generateMockRoute());
//       }

//       if (data.routes[0].overview_polyline) {
//         const encoded = data.routes[0].overview_polyline.points;
//         data.routes[0].decodedPolyline = decodePolyline(encoded);
//       }

//       res.json(data);
//     } catch (error) {
//       console.error("Directions error:", error);
//       res.status(500).json({ error: "Failed to get directions" });
//     }
//   });

//   return httpServer;
// }

// // Decode Google's encoded polyline format
// function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
//   const points: { latitude: number; longitude: number }[] = [];
//   let index = 0;
//   let lat = 0;
//   let lng = 0;

//   while (index < encoded.length) {
//     let b;
//     let shift = 0;
//     let result = 0;

//     do {
//       b = encoded.charCodeAt(index++) - 63;
//       result |= (b & 0x1f) << shift;
//       shift += 5;
//     } while (b >= 0x20);

//     const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
//     lat += dlat;

//     shift = 0;
//     result = 0;

//     do {
//       b = encoded.charCodeAt(index++) - 63;
//       result |= (b & 0x1f) << shift;
//       shift += 5;
//     } while (b >= 0x20);

//     const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
//     lng += dlng;

//     points.push({
//       latitude: lat / 1e5,
//       longitude: lng / 1e5,
//     });
//   }

//   return points;
// }

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { setupSocketIO } from "./socket";
import { createPaymentIntent, createCustomer, confirmPayment, createSetupIntent, getPaymentMethods, deletePaymentMethod } from "./stripe";
import { insertUserSchema, insertRideSchema, insertDriverSchema } from "@shared/schema";
import { supabase } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = setupSocketIO(httpServer);

  // ─── Health check endpoint (used by Railway for monitoring) ───
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "uto-backend",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── Temporary debug endpoint to diagnose production DB issues ───
  app.get("/api/debug/db-check", async (_req: Request, res: Response) => {
    try {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const urlPrefix = process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || "NOT SET";

      // Try a simple query
      const { data, error, count } = await supabase
        .from("users")
        .select("id, email", { count: "exact" })
        .limit(3);

      // Try the specific user
      const { data: specificUser, error: specificError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("email", "infokrystalai@gmail.com")
        .single();

      res.json({
        envVars: { hasUrl, hasKey, urlPrefix },
        allUsersQuery: { count, sampleEmails: data?.map((u: any) => u.email) || [], error: error?.message || null },
        specificUser: { found: !!specificUser, data: specificUser, error: specificError?.message || null },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Safe migration: ensure payment_method column exists on rides table ───
  try {
    const { error: migrationErr } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';`
    });
    if (migrationErr) {
      console.log('ℹ️ Could not run ALTER TABLE via RPC — payment_method column may already exist');
    } else {
      console.log('✅ Ensured rides.payment_method column exists');
    }
  } catch (e) {
    console.log('ℹ️ Migration check skipped:', (e as Error).message);
  }

  // ─── Safe migration: ensure estimated_fare & vehicle_type columns on later_bookings ───
  try {
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'saloon';`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_note TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS flight_number TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT FALSE;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'standard';`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS passengers INTEGER DEFAULT 1;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS luggage INTEGER DEFAULT 0;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS distance_miles NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_address TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_latitude NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_longitude NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_address TEXT DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_latitude NUMERIC DEFAULT NULL;`
    });
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_longitude NUMERIC DEFAULT NULL;`
    });
    console.log('✅ Ensured later_bookings columns exist (including coupon_code, discount_amount, return fields)');
  } catch (e) {
    console.log('ℹ️ later_bookings migration skipped:', (e as Error).message);
  }

  app.get("/api/pricing-rules/active", async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        return res.status(404).json({ error: "No active configuration found", details: error.message });
      }
      res.json(data);
    } catch (e) {
      console.error("/api/pricing-rules/active - Server error", e);
      res.status(500).json({ error: "Error fetching pricing rule" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, fullName, password, role } = req.body;

      // Manual validation — avoids camelCase/snake_case drizzle-zod ambiguity
      if (!email || !fullName) {
        return res.status(400).json({ error: "email and fullName are required" });
      }

      console.log(`📝 Register attempt: email=${email}, role=${role || 'rider'}`);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log(`⚠️ Register: user already exists: ${email}`);
        return res.status(409).json({ error: "User already exists" });
      }

      const user = await storage.createUser({
        email,
        fullName,
        password: password || null,
        role: role || "rider",
      });

      console.log(`✅ Register success: userId=${user.id}, role=${user.role}`);

      let stripeCustomerId = null;
      try {
        stripeCustomerId = await createCustomer(user.email, user.fullName);
        if (stripeCustomerId) {
          await storage.updateUser(user.id, { stripeCustomerId });
        }
      } catch (e) {
        console.warn("Failed to create Stripe customer:", e);
      }

      res.status(201).json({ user: { ...user, stripeCustomerId } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, isGoogle } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      console.log(`🔑 Login attempt: email="${email}", isGoogle=${!!isGoogle}`);
      let user = await storage.getUserByEmail(email);
      console.log(`🔑 User lookup result: ${user ? `found (id=${user.id})` : 'NOT FOUND'}`);

      // If user not found and it's a Google sign-in, auto-create the account
      if (!user) {
        if (isGoogle) {
          try {
            user = await storage.createUser({
              id: `user_${Date.now()}`,
              email,
              fullName: fullName || email.split("@")[0],
              password: "",
              role: "rider",
            });
            console.log(`✅ Auto-created user for Google sign-in: ${email}`);
          } catch (createErr) {
            console.error("Failed to auto-create Google user:", createErr);
            require('fs').writeFileSync('debug.log', String(createErr) + '\n' + JSON.stringify(createErr, Object.getOwnPropertyNames(createErr as Error)));
            return res.status(500).json({ error: "Failed to create account" });
          }
        } else {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else if (!isGoogle) {
        // Security logic: check if standard login attempts have matching passwords
        if (user.password) {
          // User has a stored password — verify it matches
          if (user.password !== password) {
            return res.status(401).json({ error: "Invalid email or password" });
          }
        } else {
          // User exists but has no password stored (e.g. created via admin panel)
          // Set the provided password as their new password (first-time setup)
          if (password) {
            await storage.updateUser(user.id, { password });
            console.log(`🔐 Password set for existing user: ${email}`);
          }
        }
      }

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and new password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return 404 or success. For a basic setup, return an error so the user knows they need to register.
        return res.status(404).json({ error: "No account found with this email" });
      }

      await storage.updateUser(user.id, { password: newPassword });

      res.json({ success: true });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id as string);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.params.id as string, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/users/:id/upload", async (req: Request, res: Response) => {
    try {
      const { base64, mimeType } = req.body;
      const user = await storage.getUser(req.params.id as string);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!base64) {
        return res.status(400).json({ error: "Missing base64 image data" });
      }

      const identifier = user.email || user.id;
      const folderName = identifier.replace(/[^a-zA-Z0-9@._-]/g, '_');

      const { supabase: sb } = await import("./db");

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType?.split("/")[1] || "jpg";
      const fileName = `${folderName}/profile-${Date.now()}.${ext}`;

      const { data, error } = await sb.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: mimeType || "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return res.status(500).json({ error: error.message });
      }

      const { data: publicUrlData } = sb.storage.from("avatars").getPublicUrl(fileName);

      await storage.updateUser(user.id, { profileImage: publicUrlData.publicUrl });

      res.status(200).json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ error: error?.message || "Failed to upload image" });
    }
  });

  app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
    try {
      const { pushToken } = req.body;
      const user = await storage.updateUser(req.params.id as string, { pushToken });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });

  app.post("/api/drivers", async (req: Request, res: Response) => {
    try {
      const { userId, vehicleType, vehicleMake, vehicleModel, licensePlate, isOnline, isAvailable, vehicleYear, vehicleColor } = req.body;

      // Manual validation — avoids drizzle-zod camelCase issues
      if (!userId || !vehicleType || !vehicleMake || !vehicleModel || !licensePlate) {
        return res.status(400).json({
          error: "userId, vehicleType, vehicleMake, vehicleModel, and licensePlate are required"
        });
      }

      console.log(`🚗 Creating driver record: userId=${userId}, plate=${licensePlate}`);

      const driver = await storage.createDriver({
        userId,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear: vehicleYear || null,
        vehicleColor: vehicleColor || null,
        licensePlate,
        isOnline: isOnline ?? false,
        isAvailable: isAvailable ?? true,
      });

      console.log(`✅ Driver record created: driverId=${driver.id}, userId=${userId}`);
      res.status(201).json({ driver });
    } catch (error) {
      console.error("Create driver error:", error);
      res.status(500).json({ error: "Failed to create driver" });
    }
  });

  app.get("/api/drivers/online", async (req: Request, res: Response) => {
    try {
      const onlineDrivers = await storage.getOnlineDrivers();
      res.json({ drivers: onlineDrivers });
    } catch (error) {
      console.error("Get online drivers error:", error);
      res.status(500).json({ error: "Failed to get online drivers" });
    }
  });

  app.get("/api/drivers/:id", async (req: Request, res: Response) => {
    try {
      const driver = await storage.getDriver(req.params.id as string);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Get driver error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.get("/api/drivers/user/:userId", async (req: Request, res: Response) => {
    try {
      const driver = await storage.getDriverByUserId(req.params.userId as string);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Get driver by user error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.get("/api/drivers/:id/deductions", async (req: Request, res: Response) => {
    try {
      const deductions = await storage.getDriverDeductions(req.params.id as string);
      res.json({ deductions });
    } catch (error) {
      console.error("Get driver deductions error:", error);
      res.status(500).json({ error: "Failed to get driver deductions" });
    }
  });

  app.put("/api/drivers/:id", async (req: Request, res: Response) => {
    try {
      const driver = await storage.updateDriver(req.params.id as string, req.body);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(500).json({ error: "Failed to update driver" });
    }
  });

  app.post("/api/drivers/:id/upload", async (req: Request, res: Response) => {
    try {
      const { base64, docType, mimeType } = req.body;
      const driver = await storage.getDriver(req.params.id as string);
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      if (!base64 || !docType) {
        return res.status(400).json({ error: "Missing base64 or docType" });
      }

      // Fetch the actual user to get their email address for easier folder recognition
      const user = await storage.getUser(driver.userId);
      const identifier = user?.email || driver.userId;
      // Sanitize email string to avoid invalid storage characters
      const folderName = identifier.replace(/[^a-zA-Z0-9@._-]/g, '_');

      // We dynamically import supabase inside the endpoint like later-bookings does 
      const { supabase: sb } = await import("./db");

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType?.split("/")[1] || "jpg";
      const fileName = `${folderName}/${docType}-${Date.now()}.${ext}`;

      const { data, error } = await sb.storage
        .from("driver_documents")
        .upload(fileName, buffer, {
          contentType: mimeType || "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Generate the public URL
      const { data: publicUrlData } = sb.storage.from("driver_documents").getPublicUrl(fileName);

      res.status(200).json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: error?.message || "Failed to upload document" });
    }
  });

  app.post("/api/rides", async (req: Request, res: Response) => {
    try {
      const parsed = insertRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const ride = await storage.createRide(parsed.data);

      io.emit("ride:new", ride);

      res.status(201).json({ ride });
    } catch (error) {
      console.error("Create ride error:", error);
      res.status(500).json({ error: "Failed to create ride" });
    }
  });

  app.get("/api/rides/:id", async (req: Request, res: Response) => {
    try {
      const ride = await storage.getRide(req.params.id as string);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      res.json({ ride });
    } catch (error) {
      console.error("Get ride error:", error);
      res.status(500).json({ error: "Failed to get ride" });
    }
  });

  app.get("/api/rides/rider/:riderId", async (req: Request, res: Response) => {
    try {
      const rides = await storage.getRidesByRider(req.params.riderId as string);
      res.json({ rides });
    } catch (error) {
      console.error("Get rider rides error:", error);
      res.status(500).json({ error: "Failed to get rides" });
    }
  });

  app.get("/api/rides/driver/:driverId", async (req: Request, res: Response) => {
    try {
      const rides = await storage.getRidesByDriver(req.params.driverId as string);
      res.json({ rides });
    } catch (error) {
      console.error("Get driver rides error:", error);
      res.status(500).json({ error: "Failed to get rides" });
    }
  });

  app.put("/api/rides/:id", async (req: Request, res: Response) => {
    try {
      const ride = await storage.updateRide(req.params.id as string, req.body);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      io.to(`rider:${ride.riderId}`).emit("ride:update", ride);
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit("ride:update", ride);
      }

      res.json({ ride });
    } catch (error) {
      console.error("Update ride error:", error);
      res.status(500).json({ error: "Failed to update ride" });
    }
  });

  app.post("/api/payments/create-intent", async (req: Request, res: Response) => {
    try {
      const { amount, customerId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const result = await createPaymentIntent(amount, "gbp", customerId);
      if (!result) {
        return res.status(500).json({ error: "Failed to create payment intent" });
      }

      res.json(result);
    } catch (error) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  app.get("/api/payments/methods/:userId", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.userId as string);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.stripeCustomerId) {
        return res.json([]);
      }

      const methods = await getPaymentMethods(user.stripeCustomerId);
      res.json(methods);
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.delete("/api/payments/methods/:methodId", async (req: Request, res: Response) => {
    try {
      const success = await deletePaymentMethod(req.params.methodId as string);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete payment method" });
      }
    } catch (error) {
      console.error("Delete payment method error:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  app.post("/api/payments/setup-intent", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await createCustomer(user.email, user.fullName || "User");
        if (customerId) {
          await storage.updateUser(userId, { stripeCustomerId: customerId });
        } else {
          return res.status(500).json({ error: "Failed to create Stripe customer" });
        }
      }

      const result = await createSetupIntent(customerId);
      if (!result) {
        return res.status(500).json({ error: "Failed to create setup intent" });
      }

      res.json(result);
    } catch (error) {
      console.error("Create setup intent error:", error);
      res.status(500).json({ error: "Failed to create setup intent" });
    }
  });

  app.post("/api/payments/confirm", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, rideId, userId, amount } = req.body;

      const success = await confirmPayment(paymentIntentId);

      if (success) {
        await storage.createPayment({
          rideId,
          userId,
          amount,
          currency: "gbp",
          status: "succeeded",
          stripePaymentIntentId: paymentIntentId,
          paymentMethod: "card",
        });

        await storage.updateRide(rideId, {
          paymentStatus: "paid",
          paymentIntentId,
        });
      }

      res.json({ success });
    } catch (error) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  app.get("/api/users/:userId/wallet/transactions", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch wallet transactions error (Supabase):", error);
        return res.status(500).json({ error: "Failed to fetch wallet transactions" });
      }

      // Map to camelCase convention if needed, though client uses standard properties 
      const transactions = data?.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        rideId: t.ride_id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.created_at,
      })) || [];

      res.json({ transactions });
    } catch (error) {
      console.error("Server error reading wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  app.post("/api/users/:userId/wallet/transactions", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { rideId, amount, type, description } = req.body;

      if (!amount || !type) {
        return res.status(400).json({ error: "Amount and type are required" });
      }

      const { data, error } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          ride_id: rideId || null,
          amount,
          type,
          description: description || ""
        })
        .select()
        .single();

      if (error) {
        console.error("Insert wallet transaction error:", error);
        return res.status(500).json({ error: "Failed to record wallet transaction" });
      }

      res.status(201).json({ transaction: data });
    } catch (error) {
      console.error("Server error recording wallet transaction:", error);
      res.status(500).json({ error: "Failed to record wallet transaction" });
    }
  });
  app.get("/api/places/saved/:userId", async (req: Request, res: Response) => {
    try {
      const places = await storage.getSavedPlaces(req.params.userId as string);
      res.json({ places });
    } catch (error) {
      console.error("Get saved places error:", error);
      res.status(500).json({ error: "Failed to get saved places" });
    }
  });

  app.post("/api/places/saved", async (req: Request, res: Response) => {
    try {
      const place = await storage.createSavedPlace(req.body);
      res.status(201).json({ place });
    } catch (error) {
      console.error("Create saved place error:", error);
      res.status(500).json({ error: "Failed to create saved place" });
    }
  });

  app.delete("/api/places/saved/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSavedPlace(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete saved place error:", error);
      res.status(500).json({ error: "Failed to delete saved place" });
    }
  });

  app.put("/api/places/saved/:id", async (req: Request, res: Response) => {
    try {
      const { name, address } = req.body;
      const snakeData: any = {};
      if (name !== undefined) snakeData.name = name;
      if (address !== undefined) snakeData.address = address;

      const { data, error } = await supabase
        .from("saved_places")
        .update(snakeData)
        .eq("id", req.params.id as string)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Place not found" });
      }
      res.json({ place: data });
    } catch (error) {
      console.error("Update saved place error:", error);
      res.status(500).json({ error: "Failed to update saved place" });
    }
  });

  app.get("/api/places/autocomplete", async (req: Request, res: Response) => {
    try {
      const { input, sessiontoken } = req.query as { input?: string; sessiontoken?: string };

      if (!input) {
        return res.status(400).json({ error: "Input is required" });
      }

      if (!process.env.GOOGLE_PLACES_API_KEY) {
        console.warn("⚠️ GOOGLE_PLACES_API_KEY is not set — returning mock predictions");
        return res.json({
          predictions: [
            {
              place_id: "mock_1",
              description: "London, UK",
              structured_formatting: { main_text: "London", secondary_text: "UK" },
            },
            {
              place_id: "mock_2",
              description: "Manchester, UK",
              structured_formatting: { main_text: "Manchester", secondary_text: "UK" },
            },
            {
              place_id: "mock_3",
              description: "Birmingham, UK",
              structured_formatting: { main_text: "Birmingham", secondary_text: "UK" },
            },
          ],
        });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input as string
        )}&key=${process.env.GOOGLE_PLACES_API_KEY}&components=country:gb&sessiontoken=${sessiontoken || ""}`
      );

      const data = await response.json();

      // Handle Google API errors (invalid key, over quota, etc.)
      if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error(`❌ Google Places Autocomplete API error: status=${data.status}, message=${data.error_message || "none"}`);
        return res.status(502).json({
          error: `Google Places API error: ${data.error_message || data.status}`,
          predictions: [],
          status: data.status,
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Places autocomplete error:", error);
      res.status(500).json({ error: "Failed to get autocomplete results", predictions: [] });
    }
  });

  app.get("/api/places/details/:placeId", async (req: Request, res: Response) => {
    try {
      const { placeId } = req.params;

      if (!process.env.GOOGLE_PLACES_API_KEY) {
        console.warn("⚠️ GOOGLE_PLACES_API_KEY is not set — returning mock place details");
        return res.json({
          result: {
            geometry: {
              location: { lat: 51.5074, lng: -0.1278 },
            },
            formatted_address: "London, UK",
          },
        });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${process.env.GOOGLE_PLACES_API_KEY}`
      );

      const data = await response.json();

      // Handle Google API errors
      if (data.status && data.status !== "OK") {
        console.error(`❌ Google Places Details API error: status=${data.status}, message=${data.error_message || "none"}`);
        return res.status(502).json({
          error: `Google Places API error: ${data.error_message || data.status}`,
          status: data.status,
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Places details error:", error);
      res.status(500).json({ error: "Failed to get place details" });
    }
  });

  // Google Directions API for route polylines
  app.get("/api/directions", async (req: Request, res: Response) => {
    try {
      const { origin, destination, waypoints } = req.query as { origin?: string; destination?: string; waypoints?: string };

      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination are required" });
      }

      const generateMockRoute = () => {
        const originCoords = (origin as string).split(",").map(Number);
        const destCoords = (destination as string).split(",").map(Number);

        const latDiff = destCoords[0] - originCoords[0];
        const lngDiff = destCoords[1] - originCoords[1];
        const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
        const distanceMiles = distanceKm * 0.621371;
        const distanceMeters = Math.round(distanceKm * 1000);
        const durationSeconds = Math.round(distanceKm * 120);

        const points: { latitude: number; longitude: number }[] = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const midOffset = Math.sin(t * Math.PI) * 0.002;
          points.push({
            latitude: originCoords[0] + latDiff * t + midOffset * (lngDiff > 0 ? 1 : -1),
            longitude: originCoords[1] + lngDiff * t + midOffset * (latDiff > 0 ? -1 : 1),
          });
        }

        return {
          routes: [{
            overview_polyline: { points: "" },
            legs: [{
              distance: { text: `${(distanceMiles).toFixed(1)} mi`, value: distanceMeters },
              duration: { text: `${Math.round(durationSeconds / 60)} mins`, value: durationSeconds },
              start_location: { lat: originCoords[0], lng: originCoords[1] },
              end_location: { lat: destCoords[0], lng: destCoords[1] },
            }],
            decodedPolyline: points,
          }],
          status: "OK",
        };
      };

      if (!process.env.GOOGLE_PLACES_API_KEY) {
        return res.json(generateMockRoute());
      }

      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin as string
      )}&destination=${encodeURIComponent(
        destination as string
      )}&key=${process.env.GOOGLE_PLACES_API_KEY}&mode=driving&units=imperial&region=gb&alternatives=true&departure_time=now`;

      if (waypoints) {
        url += `&waypoints=${encodeURIComponent(waypoints as string)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
        console.log("Google Directions API returned non-OK status:", data.status, "- falling back to mock route");
        return res.json(generateMockRoute());
      }

      // Sort routes by fastest traffic-aware duration (duration_in_traffic preferred)
      data.routes.sort((a: any, b: any) => {
        const durA = a.legs?.reduce((sum: number, leg: any) =>
          sum + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0), 0) || Infinity;
        const durB = b.legs?.reduce((sum: number, leg: any) =>
          sum + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0), 0) || Infinity;
        return durA - durB;
      });

      // For each route, replace duration with duration_in_traffic if available
      // so clients automatically see traffic-aware times
      for (const route of data.routes) {
        if (route.legs) {
          for (const leg of route.legs) {
            if (leg.duration_in_traffic) {
              // Overwrite the plain duration with the traffic-aware one
              leg.duration = leg.duration_in_traffic;
            }
          }
        }
        if (route.overview_polyline) {
          const encoded = route.overview_polyline.points;
          route.decodedPolyline = decodePolyline(encoded);
        }
      }

      res.json(data);
    } catch (error) {
      console.error("Directions error:", error);
      res.status(500).json({ error: "Failed to get directions" });
    }
  });

  // ── Scheduled Rides ────────────────────────────────────────────
  app.post("/api/scheduled-rides", async (req: Request, res: Response) => {
    try {
      const {
        riderId, pickupAddress, pickupLatitude, pickupLongitude,
        dropoffAddress, dropoffLatitude, dropoffLongitude,
        vehicleType, scheduledAt, estimatedPrice,
      } = req.body;

      if (!riderId || !pickupAddress || !dropoffAddress || !scheduledAt) {
        return res.status(400).json({ error: "riderId, pickupAddress, dropoffAddress, and scheduledAt are required" });
      }

      // Validate scheduledAt is in the future
      const schedDate = new Date(scheduledAt);
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        return res.status(400).json({ error: "scheduledAt must be a valid future date/time" });
      }

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 365);
      maxDate.setHours(23, 59, 59, 999);
      if (schedDate > maxDate) {
        return res.status(400).json({ error: "Cannot schedule a ride more than 365 days in advance" });
      }

      const now = new Date();
      const timeDiffMs = schedDate.getTime() - now.getTime();
      if (timeDiffMs <= 4 * 60 * 60 * 1000) {
        const rideId = `ride_${Date.now()}`;
        let distanceMiles = 0;
        let farePrice = estimatedPrice || 0;
        let durationMinutes = 0;
        
        if (pickupLatitude && pickupLongitude && dropoffLatitude && dropoffLongitude) {
          const R = 3958.8; 
          const dLat = (dropoffLatitude - pickupLatitude) * Math.PI / 180;
          const dLon = (dropoffLongitude - pickupLongitude) * Math.PI / 180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                    Math.cos(pickupLatitude * Math.PI / 180) * Math.cos(dropoffLatitude * Math.PI / 180) *
                    Math.sin(dLon/2)*Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceMiles = parseFloat((R * c).toFixed(2));
          durationMinutes = Math.round(distanceMiles * 3);
          if (!farePrice) farePrice = parseFloat((4 + (distanceMiles * 1.8)).toFixed(2));
        }

        const { serverRideEmitter } = await import("./socket");
        serverRideEmitter.emit("dispatch", {
          id: rideId,
          riderId,
          rideType: vehicleType || "economy",
          pickupLocation: {
            address: pickupAddress,
            latitude: pickupLatitude,
            longitude: pickupLongitude,
          },
          dropoffLocation: {
            address: dropoffAddress,
            latitude: dropoffLatitude,
            longitude: dropoffLongitude,
          },
          farePrice,
          distanceMiles,
          distanceKm: parseFloat((distanceMiles * 1.60934).toFixed(2)),
          durationMinutes,
        });

        return res.status(201).json({ scheduledRide: { id: rideId, status: "pending" } });
      }

      const scheduledRide = await storage.createScheduledRide({
        riderId,
        pickupAddress,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        dropoffAddress,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,
        vehicleType: vehicleType || "economy",
        scheduledAt,
        estimatedPrice: estimatedPrice ?? null,
      });

      res.status(201).json({ scheduledRide });
    } catch (error) {
      console.error("Create scheduled ride error:", error);
      res.status(500).json({ error: "Failed to create scheduled ride" });
    }
  });

  app.get("/api/scheduled-rides/rider/:riderId", async (req: Request, res: Response) => {
    try {
      const rides = await storage.getScheduledRidesByRider(req.params.riderId as string);
      res.json({ scheduledRides: rides });
    } catch (error) {
      console.error("Get scheduled rides error:", error);
      res.status(500).json({ error: "Failed to get scheduled rides" });
    }
  });

  // ── Later Bookings (Plan Your Ride) ─────────────────────────────────
  // Import supabase directly (db.ts exports `supabase`, not `db`)
  const { supabase: sb } = await import("./db");

  // ── Coupon Validation ───────────────────────────────────────────────
  app.post("/api/coupons/validate", async (req: Request, res: Response) => {
    try {
      const { code, fareAmount } = req.body;
      if (!code) return res.status(400).json({ error: "Coupon code is required" });

      const { data: coupon, error } = await sb
        .from("discount_coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (error || !coupon) {
        return res.status(404).json({ error: "Invalid or expired coupon code" });
      }

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: "This coupon has expired" });
      }

      // Check usage limit
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return res.status(400).json({ error: "This coupon has reached its maximum usage limit" });
      }

      // Check minimum fare
      if (coupon.min_fare && fareAmount && fareAmount < coupon.min_fare) {
        return res.status(400).json({ error: `Minimum fare of £${coupon.min_fare} required for this coupon` });
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = fareAmount ? (fareAmount * coupon.discount_amount / 100) : 0;
      } else {
        discountAmount = coupon.discount_amount;
      }

      // Don't let discount exceed fare
      if (fareAmount && discountAmount > fareAmount) {
        discountAmount = fareAmount;
      }

      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_amount,
          discountAmount: parseFloat(discountAmount.toFixed(2)),
          description: coupon.discount_type === 'percentage'
            ? `${coupon.discount_amount}% off`
            : `£${coupon.discount_amount} off`,
        },
      });
    } catch (err: any) {
      console.error("Coupon validation error:", err);
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  app.post("/api/later-bookings", async (req: Request, res: Response) => {
    try {
      const {
        riderId, pickupAddress, pickupLatitude, pickupLongitude,
        dropoffAddress, dropoffLatitude, dropoffLongitude, pickupAt, dropoffBy,
        vehicleType, estimatedFare, distanceMiles: clientDistanceMiles, durationMinutes: clientDurationMinutes,
        flightNumber, isRoundTrip, bookingType, passengers, luggage,
        couponCode, discountAmount,
        returnPickupAddress, returnPickupLatitude, returnPickupLongitude,
        returnDropoffAddress, returnDropoffLatitude, returnDropoffLongitude,
      } = req.body;

      if (!riderId || !pickupAddress || !dropoffAddress || !pickupAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const pickupTime = new Date(pickupAt);
      const dropoffTime = dropoffBy ? new Date(dropoffBy) : null;
      const now = new Date();

      if (isNaN(pickupTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      if (pickupTime <= now) {
        return res.status(400).json({ error: `Pickup time (${pickupAt}) must be in the future` });
      }

      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      maxDate.setHours(23, 59, 59, 999);
      if (pickupTime > maxDate) {
        return res.status(400).json({ error: "Pickup time cannot be more than 365 days in the future" });
      }

      if (dropoffTime) {
        const gapMs = dropoffTime.getTime() - pickupTime.getTime();
        if (gapMs < 30 * 60 * 1000) {
          return res.status(400).json({ error: `Minimum 30 minutes required between pickup and dropoff (got ${Math.round(gapMs/60000)} min)` });
        }
      }

      // If a coupon was applied, increment its used_count
      if (couponCode) {
        await sb.rpc('increment_coupon_usage', { coupon_code: couponCode.toUpperCase().trim() }).catch(() => {
          // Fallback: direct update if RPC doesn't exist
          sb.from("discount_coupons")
            .update({ used_count: sb.raw ? undefined : 0 })
            .eq("code", couponCode.toUpperCase().trim())
            .then(() => {});
        });
        // Simple fallback increment
        const { data: couponData } = await sb
          .from("discount_coupons")
          .select("used_count")
          .eq("code", couponCode.toUpperCase().trim())
          .single();
        if (couponData) {
          await sb
            .from("discount_coupons")
            .update({ used_count: (couponData.used_count || 0) + 1 })
            .eq("code", couponCode.toUpperCase().trim());
        }
      }

      const timeDiffMs = pickupTime.getTime() - now.getTime();
      if (timeDiffMs <= 4 * 60 * 60 * 1000) {
        // Within 4 hours -> Dispatch as immediate ride
        const rideId = `ride_${Date.now()}`;
        
        let distanceMiles = 0;
        let farePrice = estimatedFare || 0;
        let durationMinutes = 0;
        
        if (pickupLatitude && pickupLongitude && dropoffLatitude && dropoffLongitude) {
          const R = 3958.8; 
          const dLat = (dropoffLatitude - pickupLatitude) * Math.PI / 180;
          const dLon = (dropoffLongitude - pickupLongitude) * Math.PI / 180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                    Math.cos(pickupLatitude * Math.PI / 180) * Math.cos(dropoffLatitude * Math.PI / 180) *
                    Math.sin(dLon/2)*Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceMiles = R * c;
          durationMinutes = Math.max(1, distanceMiles * 3);
          
          if (!farePrice && distanceMiles > 0) {
            farePrice = 4.0 + (distanceMiles * 1.5) + (durationMinutes * 0.35);
          }
        } else if (clientDistanceMiles) {
          distanceMiles = clientDistanceMiles;
          durationMinutes = clientDurationMinutes || Math.max(1, distanceMiles * 3);
        }

        await storage.createRide({
          id: rideId,
          riderId,
          pickupAddress,
          pickupLatitude: pickupLatitude ?? 0,
          pickupLongitude: pickupLongitude ?? 0,
          dropoffAddress,
          dropoffLatitude: dropoffLatitude ?? 0,
          dropoffLongitude: dropoffLongitude ?? 0,
          status: "pending",
          vehicleType: vehicleType || 'saloon',
          estimatedPrice: farePrice,
          distance: distanceMiles,
          estimatedDuration: durationMinutes,
        });

        io.emit('new_ride_request', {
          id: rideId,
          riderId,
          pickupAddress,
          pickupLat: pickupLatitude ?? 0,
          pickupLng: pickupLongitude ?? 0,
          dropoffAddress,
          dropoffLat: dropoffLatitude ?? 0,
          dropoffLng: dropoffLongitude ?? 0,
          vehicleType: vehicleType || 'saloon',
          farePrice,
          distanceMiles,
          distanceKm: parseFloat((distanceMiles * 1.60934).toFixed(2)),
          durationMinutes,
        });

        return res.status(201).json({ booking: { id: rideId, status: "pending" } });
      }

      let finalDropoffTime = dropoffTime;
      if (!finalDropoffTime) {
        const mins = clientDurationMinutes || 30;
        finalDropoffTime = new Date(pickupTime.getTime() + mins * 60000);
      }

      const insertData: any = {
          rider_id: riderId,
          pickup_address: pickupAddress,
          pickup_latitude: pickupLatitude ?? null,
          pickup_longitude: pickupLongitude ?? null,
          dropoff_address: dropoffAddress,
          dropoff_latitude: dropoffLatitude ?? null,
          dropoff_longitude: dropoffLongitude ?? null,
          pickup_at: pickupTime.toISOString(),
          dropoff_by: finalDropoffTime.toISOString(),
          status: "scheduled",
          vehicle_type: vehicleType || 'saloon',
          estimated_fare: estimatedFare ?? null,
          distance_miles: clientDistanceMiles ?? null,
          duration_minutes: clientDurationMinutes ?? null,
          flight_number: flightNumber ?? null,
          is_round_trip: isRoundTrip ?? false,
          booking_type: bookingType || 'standard',
          passengers: passengers ?? 1,
          luggage: luggage ?? 0,
          coupon_code: couponCode ?? null,
          discount_amount: discountAmount ?? 0,
          return_pickup_address: returnPickupAddress ?? null,
          return_pickup_latitude: returnPickupLatitude ?? null,
          return_pickup_longitude: returnPickupLongitude ?? null,
          return_dropoff_address: returnDropoffAddress ?? null,
          return_dropoff_latitude: returnDropoffLatitude ?? null,
          return_dropoff_longitude: returnDropoffLongitude ?? null,
      };

      let { data, error } = await sb
        .from("later_bookings")
        .insert(insertData)
        .select()
        .single();

      // If columns don't exist in Supabase yet, the first insert will fail.
      if (error) {
        console.warn('⚠️ later_bookings insert failed (likely missing columns), retrying without extended fields. Original error:', error.message);
        delete insertData.vehicle_type;
        delete insertData.estimated_fare;
        delete insertData.distance_miles;
        delete insertData.duration_minutes;
        delete insertData.flight_number;
        delete insertData.is_round_trip;
        delete insertData.booking_type;
        delete insertData.passengers;
        delete insertData.luggage;
        delete insertData.coupon_code;
        delete insertData.discount_amount;
        delete insertData.return_pickup_address;
        delete insertData.return_pickup_latitude;
        delete insertData.return_pickup_longitude;
        delete insertData.return_dropoff_address;
        delete insertData.return_dropoff_latitude;
        delete insertData.return_dropoff_longitude;
        const retry = await sb
          .from("later_bookings")
          .insert(insertData)
          .select()
          .single();
        
        // If retry succeeded, clear the error
        if (!retry.error) {
          data = retry.data;
          error = null;
        } else {
          // If retry also failed, restore the original error for debugging or keep retry error
          error = retry.error;
        }
      }

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: error.message || "Database error" });
      }
      res.status(201).json({ booking: data });
    } catch (error: any) {
      console.error("Create later booking error:", error);
      res.status(500).json({ error: error?.message || "Failed to create booking" });
    }
  });

  app.get("/api/later-bookings", async (req: Request, res: Response) => {
    try {
      const { driverId } = req.query;

      let query = sb
        .from("later_bookings")
        .select("*")
        .order("pickup_at", { ascending: true });

      if (driverId) {
        // Driver sees unassigned scheduled rides OR rides that they previously accepted (which includes cancelled by user)
        query = query.or(`status.eq.scheduled,and(status.eq.driver_accepted,driver_id.eq.${driverId}),and(status.eq.cancelled,driver_id.eq.${driverId})`);
      } else {
        query = query.in("status", ["scheduled", "driver_accepted"]);
      }

      const { data, error } = await query;

      if (error) return res.status(500).json({ error: error.message });
      res.json({ bookings: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to fetch bookings" });
    }
  });

  app.get("/api/later-bookings/rider/:riderId", async (req: Request, res: Response) => {
    try {
      const { data, error } = await sb
        .from("later_bookings")
        .select("*")
        .eq("rider_id", req.params.riderId as string)
        .order("pickup_at", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      res.json({ bookings: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to fetch bookings" });
    }
  });

  app.put("/api/later-bookings/:id/accept", async (req: Request, res: Response) => {
    try {
      const { driverId } = req.body;
      const updateData: any = { status: "driver_accepted", updated_at: new Date().toISOString() };
      
      if (driverId) {
        updateData.driver_id = driverId;
      }

      const { data, error } = await sb
        .from("later_bookings")
        .update(updateData)
        .eq("id", req.params.id as string)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ booking: data });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to accept booking" });
    }
  });

  app.put("/api/later-bookings/:id/cancel", async (req: Request, res: Response) => {
    try {
      const { cancelledBy } = req.body || {}; // 'rider' | 'driver'

      // ── Fetch current booking ──
      const { data: booking, error: fetchErr } = await sb
        .from("later_bookings")
        .select("*")
        .eq("id", req.params.id as string)
        .single();

      if (fetchErr || !booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({ error: "Booking already cancelled" });
      }

      const now = new Date();
      const pickupTime = new Date(booking.pickup_at);
      const msUntilPickup = pickupTime.getTime() - now.getTime();
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
      const pastPickup = msUntilPickup < 0;
      const estimatedFare = booking.estimated_fare || 0;

      let cancellationFee = 0;
      let refundAmount = 0;
      let penaltyNote = '';

      if (cancelledBy === 'rider') {
        if (withinThreeHours || pastPickup) {
          // Charge full fare — no refund
          cancellationFee = estimatedFare;
          penaltyNote = `Cancellation within 3 hours — full fare of £${estimatedFare.toFixed(2)} charged.`;

          // Deduct from rider wallet if they have balance
          if (booking.rider_id && estimatedFare > 0) {
            try {
              const { data: riderRow } = await sb.from('users').select('wallet_balance').eq('id', booking.rider_id).single();
              const currentBalance = riderRow?.wallet_balance || 0;
              const newBalance = Math.max(0, currentBalance - estimatedFare);
              await sb.from('users').update({ wallet_balance: newBalance }).eq('id', booking.rider_id);
              // Record wallet transaction
              await sb.from('wallet_transactions').insert({
                user_id: booking.rider_id,
                ride_id: booking.id,
                amount: estimatedFare,
                type: 'debit',
                description: `Late cancellation fee — booking within 3 hours of pickup`,
              });
              console.log(`💸 Late cancel: rider ${booking.rider_id} charged £${estimatedFare}`);
            } catch (walletErr) {
              console.error('Failed to charge rider wallet for late cancel:', walletErr);
            }
          }
        } else {
          // Free cancellation — issue full refund
          refundAmount = estimatedFare > 0 ? estimatedFare : 0;
          penaltyNote = 'Free cancellation — more than 3 hours before pickup.';
          // If they prepaid something, refund it (stub — payment logic would go here)
          console.log(`✅ Free cancel: rider ${booking.rider_id}, refund would be £${refundAmount}`);
        }
      } else if (cancelledBy === 'driver') {
        // Driver cancellation within 3 hours: 50% penalty
        if (withinThreeHours || pastPickup) {
          const driverPenalty = estimatedFare * 0.5;
          penaltyNote = `Driver late cancellation — 50% penalty of £${driverPenalty.toFixed(2)} applies.`;

          if (booking.driver_id && driverPenalty > 0) {
            try {
              // Add a deduction record for the driver
              await sb.from('driver_deductions').insert({
                driver_id: booking.driver_id,
                amount: driverPenalty,
                type: 'late_cancel_penalty',
                reason: `Late cancellation penalty (50%) for scheduled booking ${booking.id}`,
              });
              console.log(`💸 Driver ${booking.driver_id} penalised £${driverPenalty} for late cancel`);
            } catch (penaltyErr) {
              console.error('Failed to record driver penalty:', penaltyErr);
            }
          }
        } else {
          penaltyNote = 'Driver cancelled more than 3 hours before pickup — no penalty.';
        }
      }

      const { data, error } = await sb
        .from("later_bookings")
        .update({
          status: "cancelled",
          updated_at: now.toISOString(),
          cancellation_fee: cancellationFee,
          cancellation_note: penaltyNote,
          cancelled_by: cancelledBy || 'rider',
        })
        .eq("id", req.params.id as string)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      res.json({ booking: data, withinThreeHours, cancellationFee, penaltyNote });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to cancel booking" });
    }
  });

  app.post("/api/rides/:id/rating", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { riderRating, driverRating, riderComment, driverComment, ratedBy } = req.body;

      const updateData: any = {};
      
      if (ratedBy === "driver") {
        if (riderRating !== undefined) updateData.rider_rating = riderRating;
        if (riderComment !== undefined) updateData.rider_comment = riderComment;
      } else if (ratedBy === "rider") {
        if (driverRating !== undefined) updateData.driver_rating = driverRating;
        if (driverComment !== undefined) updateData.driver_comment = driverComment;
      }

      const { data, error } = await supabase
        .from("rides")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error saving rating:", error);
        return res.status(500).json({ error: "Database error saving rating" });
      }

      res.json({ success: true, ride: data });
    } catch (error: any) {
      console.error("Save rating error:", error);
      res.status(500).json({ error: error?.message || "Failed to save rating" });
    }
  });

  return httpServer;


}

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}
