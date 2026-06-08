import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getRoomTypes, createRoomType, updateRoomType,
  getRooms, createRoom, updateRoom,
  getGuests, createGuest, updateGuest,
  getBookings, createBooking, updateBookingStatus, getAvailableRooms,
  getHotelDashboard,
} from "../controllers/hotel.controller";

const router = Router();
router.use(authenticate);

// Room types
router.get   ("/room-types",          getRoomTypes);
router.post  ("/room-types",          createRoomType);
router.patch ("/room-types/:id",      updateRoomType);

// Rooms
router.get   ("/rooms",               getRooms);
router.get   ("/rooms/available",     getAvailableRooms);
router.post  ("/rooms",               createRoom);
router.patch ("/rooms/:id",           updateRoom);

// Guests
router.get   ("/guests",              getGuests);
router.post  ("/guests",              createGuest);
router.patch ("/guests/:id",          updateGuest);

// Bookings
router.get   ("/bookings",            getBookings);
router.post  ("/bookings",            createBooking);
router.patch ("/bookings/:id/status", updateBookingStatus);

// Dashboard
router.get   ("/dashboard",           getHotelDashboard);

export default router;
