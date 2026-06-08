import { useState, useEffect, useCallback } from "react";
import {
  Hotel, Plus, BedDouble, CalendarCheck, Users, Search,
  CheckCircle, X, LogIn, LogOut, RefreshCw, Edit2,
  AlertCircle, Clock, DollarSign,
} from "lucide-react";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface RoomType { id: string; name: string; basePrice: number; capacity: number; bedType?: string; amenities: string[]; }
interface Room { id: string; roomNumber: string; floor: number; status: string; roomType: RoomType; notes?: string; }
interface Guest { id: string; name: string; phone: string; email?: string; nationality: string; totalStays: number; }
interface Booking {
  id: string; bookingNumber: string; status: string;
  checkIn: string; checkOut: string; totalNights: number;
  ratePerNight: number; total: number; balanceDue: number; advancePaid: number;
  adults: number; children: number; source?: string;
  room: Room & { roomType: RoomType }; guest: Guest;
}

// ── Constants ─────────────────────────────────────────────────

const ROOM_COLOR: Record<string, string> = {
  AVAILABLE: "#10b981", OCCUPIED: "#ef4444", RESERVED: "#f59e0b",
  CLEANING: "#6366f1", MAINTENANCE: "#6b7280", OUT_OF_ORDER: "#991b1b",
};
const BOOKING_COLOR: Record<string, string> = {
  CONFIRMED: "#6366f1", CHECKED_IN: "#10b981", CHECKED_OUT: "#6b7280",
  CANCELLED: "#ef4444", NO_SHOW: "#f59e0b",
};
const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
  background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-hover)",
  color: active ? "white" : "var(--text-sec)",
});
const CARD: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16,
};
const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--border-input)", background: "var(--bg-hover)",
  color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};
const BTN_PRIMARY: React.CSSProperties = {
  width: "100%", marginTop: 4, height: 40, borderRadius: 9, border: "none",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
};

// ── Main Component ────────────────────────────────────────────

export default function HotelPage() {
  const [tab, setTab] = useState<"dashboard" | "rooms" | "bookings" | "guests">("dashboard");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [bookingStatus, setBookingStatus] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [roomForm, setRoomForm] = useState({ roomNumber: "", roomTypeId: "", floor: "1", notes: "" });
  const [roomTypeForm, setRoomTypeForm] = useState({ name: "", description: "", basePrice: "", capacity: "2", bedType: "", amenities: "" });
  const [bookingForm, setBookingForm] = useState({
    roomId: "", guestId: "", checkIn: "", checkOut: "", adults: "1", children: "0",
    ratePerNight: "", discount: "0", advancePaid: "0", paymentMethod: "CASH",
    source: "Direct", specialRequests: "", notes: "",
  });
  const [guestForm, setGuestForm] = useState({
    name: "", phone: "", email: "", idType: "Aadhaar", idNumber: "", address: "", city: "", nationality: "Indian",
  });
  const [newGuestInline, setNewGuestInline] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, rt, b, g, s] = await Promise.all([
        api.get("/hotel/rooms"),
        api.get("/hotel/room-types"),
        api.get(`/hotel/bookings${bookingStatus ? `?status=${bookingStatus}` : ""}`),
        api.get(`/hotel/guests${guestSearch ? `?q=${encodeURIComponent(guestSearch)}` : ""}`),
        api.get("/hotel/dashboard"),
      ]);
      setRooms(r.data.data || []);
      setRoomTypes(rt.data.data || []);
      setBookings(b.data.data?.bookings || []);
      setGuests(g.data.data || []);
      setStats(s.data.data);
    } catch (e) { setError(getApiError(e)); }
  }, [bookingStatus, guestSearch]);

  useEffect(() => { load(); }, [bookingStatus]);

  async function searchGuests() {
    try {
      const g = await api.get(`/hotel/guests${guestSearch ? `?q=${encodeURIComponent(guestSearch)}` : ""}`);
      setGuests(g.data.data || []);
    } catch (e) { setError(getApiError(e)); }
  }

  // ── Room Type ────────────────────────────────────────────────

  async function saveRoomType() {
    if (!roomTypeForm.name || !roomTypeForm.basePrice) return;
    setLoading(true);
    try {
      await api.post("/hotel/room-types", {
        ...roomTypeForm, basePrice: parseFloat(roomTypeForm.basePrice),
        capacity: parseInt(roomTypeForm.capacity),
        amenities: roomTypeForm.amenities.split(",").map(a => a.trim()).filter(Boolean),
      });
      setShowRoomTypeModal(false);
      setRoomTypeForm({ name: "", description: "", basePrice: "", capacity: "2", bedType: "", amenities: "" });
      await load();
    } catch (e) { setError(getApiError(e)); }
    setLoading(false);
  }

  // ── Room ─────────────────────────────────────────────────────

  async function saveRoom() {
    if (!roomForm.roomNumber || !roomForm.roomTypeId) return;
    setLoading(true);
    try {
      if (editingRoom) {
        await api.patch(`/hotel/rooms/${editingRoom.id}`, { ...roomForm, floor: parseInt(roomForm.floor) });
      } else {
        await api.post("/hotel/rooms", { ...roomForm, floor: parseInt(roomForm.floor) });
      }
      setShowRoomModal(false); setEditingRoom(null);
      setRoomForm({ roomNumber: "", roomTypeId: "", floor: "1", notes: "" });
      await load();
    } catch (e) { setError(getApiError(e)); }
    setLoading(false);
  }

  // ── Guest ─────────────────────────────────────────────────────

  async function saveGuest(): Promise<Guest | null> {
    if (!guestForm.name || !guestForm.phone) return null;
    setLoading(true);
    try {
      const res = await api.post("/hotel/guests", guestForm);
      const g = res.data.data;
      await load();
      setLoading(false);
      return g;
    } catch (e) { setError(getApiError(e)); setLoading(false); return null; }
  }

  // ── Booking ───────────────────────────────────────────────────

  async function createBooking() {
    if (!bookingForm.roomId || !bookingForm.guestId || !bookingForm.checkIn || !bookingForm.checkOut || !bookingForm.ratePerNight) return;
    setLoading(true);
    try {
      await api.post("/hotel/bookings", {
        ...bookingForm,
        ratePerNight: parseFloat(bookingForm.ratePerNight),
        adults:       parseInt(bookingForm.adults),
        children:     parseInt(bookingForm.children),
        discount:     parseFloat(bookingForm.discount || "0"),
        advancePaid:  parseFloat(bookingForm.advancePaid || "0"),
      });
      setShowBookingModal(false);
      setBookingForm({ roomId: "", guestId: "", checkIn: "", checkOut: "", adults: "1", children: "0", ratePerNight: "", discount: "0", advancePaid: "0", paymentMethod: "CASH", source: "Direct", specialRequests: "", notes: "" });
      await load();
    } catch (e) { setError(getApiError(e)); }
    setLoading(false);
  }

  async function updateStatus(bookingId: string, status: string) {
    try {
      await api.patch(`/hotel/bookings/${bookingId}/status`, { status });
      await load();
    } catch (e) { setError(getApiError(e)); }
  }

  // ── Derived ────────────────────────────────────────────────

  const visibleRooms = rooms.filter(r => !roomFilter || r.status === roomFilter);

  // Auto-fill rate when room is selected
  function onRoomSelect(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    setBookingForm(f => ({ ...f, roomId, ratePerNight: room ? String(room.roomType.basePrice) : f.ratePerNight }));
  }

  // Nights preview
  const nights = bookingForm.checkIn && bookingForm.checkOut
    ? Math.max(0, Math.ceil((new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) / 86400000))
    : 0;
  const previewTotal = nights * parseFloat(bookingForm.ratePerNight || "0");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Hotel size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Hotel & Resort Management</h1>
            <p style={{ fontSize: 12, color: "var(--text-ghost)", margin: 0 }}>Room booking, check-in / check-out, guest profiles</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {stats && (
            <>
              <HotelStat label="Available" value={stats.rooms?.AVAILABLE || 0} color="#10b981" />
              <HotelStat label="Occupied"  value={stats.rooms?.OCCUPIED  || 0} color="#ef4444" />
              <HotelStat label="Check-ins Today" value={stats.todayCheckIns || 0} color="#f59e0b" />
              <HotelStat label="Month Revenue" value={`₹${((stats.monthRevenue||0)/1000).toFixed(1)}k`} color="#6366f1" />
            </>
          )}
          <button onClick={load} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: "pointer", color: "var(--text-sec)" }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, fontSize: 13, color: "#f87171", display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171" }}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["dashboard", "rooms", "bookings", "guests"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={TAB_STYLE(tab === t)}>
            {t === "dashboard" ? "🏨 Overview" : t === "rooms" ? "🛏 Rooms" : t === "bookings" ? "📅 Bookings" : "👤 Guests"}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab === "dashboard" && stats && (
        <div>
          {/* Room status grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            {Object.entries(ROOM_COLOR).map(([status, color]) => (
              <div key={status} style={{ ...CARD, textAlign: "center", borderTop: `3px solid ${color}` }}>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{stats.rooms?.[status] || 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{status.replace("_", " ")}</div>
              </div>
            ))}
          </div>

          {/* Today section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <LogIn size={16} color="#10b981" />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Today's Check-ins ({stats.todayCheckIns})</span>
              </div>
              {(stats.upcomingBookings || []).slice(0, 5).map((b: Booking) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.guest.name}</div>
                    <div style={{ color: "var(--text-ghost)", fontSize: 12 }}>Room {b.room.roomNumber} — {b.room.roomType.name}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-ghost)" }}>
                    <div>{b.adults}A {b.children > 0 ? `${b.children}C` : ""}</div>
                    <div style={{ color: "#6366f1", fontWeight: 600 }}>₹{Number(b.total).toFixed(0)}</div>
                  </div>
                </div>
              ))}
              {!(stats.upcomingBookings?.length) && <div style={{ color: "var(--text-ghost)", fontSize: 13 }}>No check-ins today</div>}
            </div>
            <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>This Month</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>₹{(stats.monthRevenue || 0).toLocaleString("en-IN")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowRoomTypeModal(true); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: "pointer", fontSize: 12, color: "var(--text-sec)" }}>
                  + Room Type
                </button>
                <button onClick={() => setShowBookingModal(true)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: "pointer", fontSize: 12, color: "white", fontWeight: 600 }}>
                  + New Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ROOMS ══ */}
      {tab === "rooms" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setShowRoomTypeModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: "pointer", fontSize: 13, color: "var(--text-sec)" }}>
              <Plus size={14} /> Add Room Type
            </button>
            <button onClick={() => { setEditingRoom(null); setShowRoomModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: "pointer", fontSize: 13, color: "white", fontWeight: 600 }}>
              <Plus size={14} /> Add Room
            </button>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {["", "AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"].map(s => (
                <button key={s} onClick={() => setRoomFilter(s)} style={{ ...TAB_STYLE(roomFilter === s), padding: "5px 10px", fontSize: 11 }}>
                  {s || "All"}
                </button>
              ))}
            </div>
          </div>

          {/* Room types summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {roomTypes.map(rt => (
              <div key={rt.id} style={{ ...CARD, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                <BedDouble size={16} color="#6366f1" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{rt.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>₹{Number(rt.basePrice).toFixed(0)}/night · {rt.capacity} guests</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rooms by floor */}
          {Array.from(new Set(visibleRooms.map(r => r.floor))).sort().map(floor => {
            const floorRooms = visibleRooms.filter(r => r.floor === floor);
            return (
              <div key={floor} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Floor {floor}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                  {floorRooms.map(room => (
                    <div key={room.id} style={{ ...CARD, borderTop: `3px solid ${ROOM_COLOR[room.status] || "#6366f1"}`, cursor: "pointer" }}
                      onClick={() => { setEditingRoom(room); setRoomForm({ roomNumber: room.roomNumber, roomTypeId: room.roomType.id, floor: String(room.floor), notes: room.notes || "" }); setShowRoomModal(true); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: ROOM_COLOR[room.status] }}>#{room.roomNumber}</div>
                        <Edit2 size={12} color="var(--text-ghost)" />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 4 }}>{room.roomType.name}</div>
                      <div style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, background: `${ROOM_COLOR[room.status]}22`, color: ROOM_COLOR[room.status], fontSize: 10, fontWeight: 700 }}>
                        {room.status.replace("_", " ")}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 4 }}>
                        ₹{Number(room.roomType.basePrice).toFixed(0)}/night
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!visibleRooms.length && <div style={{ textAlign: "center", padding: 50, color: "var(--text-ghost)" }}><BedDouble size={36} style={{ opacity: 0.3, marginBottom: 10 }} /><div>No rooms found</div></div>}
        </div>
      )}

      {/* ══ BOOKINGS ══ */}
      {tab === "bookings" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setShowBookingModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: "pointer", fontSize: 13, color: "white", fontWeight: 600 }}>
              <Plus size={14} /> New Booking
            </button>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map(s => (
                <button key={s} onClick={() => setBookingStatus(s)} style={{ ...TAB_STYLE(bookingStatus === s), padding: "5px 10px", fontSize: 11 }}>
                  {s || "All"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bookings.map(b => (
              <div key={b.id} style={{ ...CARD, borderLeft: `4px solid ${BOOKING_COLOR[b.status] || "#6366f1"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{b.bookingNumber}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${BOOKING_COLOR[b.status]}22`, color: BOOKING_COLOR[b.status], fontWeight: 700 }}>{b.status.replace("_", " ")}</span>
                      {b.source && <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>via {b.source}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>
                      <strong>{b.guest.name}</strong> · {b.guest.phone}
                      {b.adults > 1 && ` · ${b.adults} adults`}
                      {b.children > 0 && ` · ${b.children} children`}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-ghost)", marginTop: 2 }}>
                      Room #{b.room.roomNumber} ({b.room.roomType.name})
                      · {new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      → {new Date(b.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      · {b.totalNights} night{b.totalNights !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#6366f1" }}>₹{Number(b.total).toFixed(0)}</div>
                    {Number(b.balanceDue) > 0 && (
                      <div style={{ fontSize: 11, color: "#ef4444" }}>Due ₹{Number(b.balanceDue).toFixed(0)}</div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                      {b.status === "CONFIRMED" && (
                        <button onClick={() => updateStatus(b.id, "CHECKED_IN")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", background: "#10b981", color: "white", fontSize: 12, cursor: "pointer" }}>
                          <LogIn size={12} /> Check In
                        </button>
                      )}
                      {b.status === "CHECKED_IN" && (
                        <button onClick={() => updateStatus(b.id, "CHECKED_OUT")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", background: "#6366f1", color: "white", fontSize: 12, cursor: "pointer" }}>
                          <LogOut size={12} /> Check Out
                        </button>
                      )}
                      {b.status === "CONFIRMED" && (
                        <button onClick={() => updateStatus(b.id, "CANCELLED")}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-hover)", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!bookings.length && (
              <div style={{ textAlign: "center", padding: 50, color: "var(--text-ghost)" }}>
                <CalendarCheck size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div>No bookings found</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ GUESTS ══ */}
      {tab === "guests" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-ghost)" }} />
              <input value={guestSearch} onChange={e => setGuestSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchGuests()} placeholder="Search guests by name, phone, email…"
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: "1px solid var(--border-input)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
            </div>
            <button onClick={searchGuests} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-hover)", cursor: "pointer", fontSize: 13, color: "var(--text-sec)" }}>Search</button>
            <button onClick={() => setShowGuestModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", cursor: "pointer", fontSize: 13, color: "white", fontWeight: 600 }}>
              <Plus size={14} /> Add Guest
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {guests.map(g => (
              <div key={g.id} style={CARD}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-ghost)" }}>{g.phone}</div>
                    {g.email && <div style={{ fontSize: 12, color: "var(--text-ghost)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.email}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "rgba(99,102,241,0.1)", color: "#6366f1", fontWeight: 600 }}>
                        {g.totalStays} stays
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>{g.nationality}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!guests.length && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 50, color: "var(--text-ghost)" }}><Users size={36} style={{ opacity: 0.3, marginBottom: 10 }} /><div>No guests found</div></div>}
          </div>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}

      {/* Room Type Modal */}
      {showRoomTypeModal && (
        <HotelModal title="Add Room Type" onClose={() => setShowRoomTypeModal(false)}>
          <FF label="Name *"><input value={roomTypeForm.name} onChange={e => setRoomTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="Standard / Deluxe / Suite" style={INPUT_STYLE} /></FF>
          <FF label="Base Price / Night (₹) *"><input value={roomTypeForm.basePrice} onChange={e => setRoomTypeForm(f => ({ ...f, basePrice: e.target.value }))} type="number" min="0" placeholder="0" style={INPUT_STYLE} /></FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Capacity (guests)"><input value={roomTypeForm.capacity} onChange={e => setRoomTypeForm(f => ({ ...f, capacity: e.target.value }))} type="number" min="1" style={INPUT_STYLE} /></FF>
            <FF label="Bed Type"><input value={roomTypeForm.bedType} onChange={e => setRoomTypeForm(f => ({ ...f, bedType: e.target.value }))} placeholder="King / Queen / Twin" style={INPUT_STYLE} /></FF>
          </div>
          <FF label="Amenities (comma-separated)"><input value={roomTypeForm.amenities} onChange={e => setRoomTypeForm(f => ({ ...f, amenities: e.target.value }))} placeholder="AC, WiFi, TV, Hot Water…" style={INPUT_STYLE} /></FF>
          <FF label="Description"><input value={roomTypeForm.description} onChange={e => setRoomTypeForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" style={INPUT_STYLE} /></FF>
          <button onClick={saveRoomType} disabled={loading} style={BTN_PRIMARY}>{loading ? "Saving…" : "Add Room Type"}</button>
        </HotelModal>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <HotelModal title={editingRoom ? "Edit Room" : "Add Room"} onClose={() => { setShowRoomModal(false); setEditingRoom(null); }}>
          <FF label="Room Number *"><input value={roomForm.roomNumber} onChange={e => setRoomForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="101, 202A…" style={INPUT_STYLE} /></FF>
          <FF label="Room Type *">
            <select value={roomForm.roomTypeId} onChange={e => setRoomForm(f => ({ ...f, roomTypeId: e.target.value }))} style={INPUT_STYLE}>
              <option value="">Select type</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name} — ₹{Number(rt.basePrice).toFixed(0)}/night</option>)}
            </select>
          </FF>
          <FF label="Floor">
            <input value={roomForm.floor} onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))} type="number" min="0" placeholder="1" style={INPUT_STYLE} />
          </FF>
          {editingRoom && (
            <FF label="Status">
              <select value={undefined} onChange={e => api.patch(`/hotel/rooms/${editingRoom.id}`, { status: e.target.value }).then(load)} style={INPUT_STYLE}>
                {["AVAILABLE","OCCUPIED","RESERVED","CLEANING","MAINTENANCE","OUT_OF_ORDER"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </FF>
          )}
          <button onClick={saveRoom} disabled={loading} style={BTN_PRIMARY}>{loading ? "Saving…" : editingRoom ? "Update Room" : "Add Room"}</button>
        </HotelModal>
      )}

      {/* Guest Modal */}
      {showGuestModal && (
        <HotelModal title="Add Guest Profile" onClose={() => setShowGuestModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Full Name *"><input value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))} placeholder="Guest name" style={INPUT_STYLE} /></FF>
            <FF label="Phone *"><input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765…" style={INPUT_STYLE} /></FF>
          </div>
          <FF label="Email"><input value={guestForm.email} onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))} placeholder="guest@email.com" style={INPUT_STYLE} /></FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="ID Type">
              <select value={guestForm.idType} onChange={e => setGuestForm(f => ({ ...f, idType: e.target.value }))} style={INPUT_STYLE}>
                {["Aadhaar","PAN","Passport","Driving Licence","Voter ID"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FF>
            <FF label="ID Number"><input value={guestForm.idNumber} onChange={e => setGuestForm(f => ({ ...f, idNumber: e.target.value }))} placeholder="ID number" style={INPUT_STYLE} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="City"><input value={guestForm.city} onChange={e => setGuestForm(f => ({ ...f, city: e.target.value }))} placeholder="City" style={INPUT_STYLE} /></FF>
            <FF label="Nationality"><input value={guestForm.nationality} onChange={e => setGuestForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Indian" style={INPUT_STYLE} /></FF>
          </div>
          <button onClick={async () => { const g = await saveGuest(); if (g) setShowGuestModal(false); }} disabled={loading} style={BTN_PRIMARY}>{loading ? "Saving…" : "Add Guest"}</button>
        </HotelModal>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <HotelModal title="New Booking" onClose={() => setShowBookingModal(false)}>
          <FF label="Room *">
            <select value={bookingForm.roomId} onChange={e => onRoomSelect(e.target.value)} style={INPUT_STYLE}>
              <option value="">Select room</option>
              {rooms.filter(r => ["AVAILABLE","RESERVED"].includes(r.status)).map(r => (
                <option key={r.id} value={r.id}>Room #{r.roomNumber} — {r.roomType.name} (₹{Number(r.roomType.basePrice).toFixed(0)}/night)</option>
              ))}
            </select>
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Check-in *"><input type="date" value={bookingForm.checkIn} onChange={e => setBookingForm(f => ({ ...f, checkIn: e.target.value }))} style={INPUT_STYLE} /></FF>
            <FF label="Check-out *"><input type="date" value={bookingForm.checkOut} onChange={e => setBookingForm(f => ({ ...f, checkOut: e.target.value }))} style={INPUT_STYLE} /></FF>
          </div>
          {nights > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.08)", fontSize: 13, color: "#6366f1", fontWeight: 600, marginBottom: 8 }}>
              {nights} nights · Est. ₹{previewTotal.toLocaleString("en-IN")}
            </div>
          )}
          <FF label="Guest *">
            <select value={bookingForm.guestId} onChange={e => setBookingForm(f => ({ ...f, guestId: e.target.value }))} style={INPUT_STYLE}>
              <option value="">Select guest</option>
              {guests.map(g => <option key={g.id} value={g.id}>{g.name} · {g.phone}</option>)}
            </select>
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <FF label="Rate/Night (₹) *"><input value={bookingForm.ratePerNight} onChange={e => setBookingForm(f => ({ ...f, ratePerNight: e.target.value }))} type="number" min="0" style={INPUT_STYLE} /></FF>
            <FF label="Adults"><input value={bookingForm.adults} onChange={e => setBookingForm(f => ({ ...f, adults: e.target.value }))} type="number" min="1" style={INPUT_STYLE} /></FF>
            <FF label="Children"><input value={bookingForm.children} onChange={e => setBookingForm(f => ({ ...f, children: e.target.value }))} type="number" min="0" style={INPUT_STYLE} /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Advance Paid (₹)"><input value={bookingForm.advancePaid} onChange={e => setBookingForm(f => ({ ...f, advancePaid: e.target.value }))} type="number" min="0" style={INPUT_STYLE} /></FF>
            <FF label="Payment Method">
              <select value={bookingForm.paymentMethod} onChange={e => setBookingForm(f => ({ ...f, paymentMethod: e.target.value }))} style={INPUT_STYLE}>
                {["CASH","CARD","UPI","NEFT","RTGS"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FF>
          </div>
          <FF label="Source">
            <select value={bookingForm.source} onChange={e => setBookingForm(f => ({ ...f, source: e.target.value }))} style={INPUT_STYLE}>
              {["Direct","Walk-in","OTA (MakeMyTrip)","OTA (Booking.com)","Phone","WhatsApp","Travel Agent"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FF>
          <FF label="Special Requests"><input value={bookingForm.specialRequests} onChange={e => setBookingForm(f => ({ ...f, specialRequests: e.target.value }))} placeholder="Any special requirements…" style={INPUT_STYLE} /></FF>
          <button onClick={createBooking} disabled={loading} style={BTN_PRIMARY}>{loading ? "Creating…" : "Confirm Booking"}</button>
        </HotelModal>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────

function HotelStat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>{label}</div>
    </div>
  );
}

function HotelModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
