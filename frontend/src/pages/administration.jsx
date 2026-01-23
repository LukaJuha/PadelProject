import { useState, useContext, useEffect } from "react";
import UserContext from "../user-context.jsx";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { User, Player, Club, Admin, Field, Booking, Reservation } from "../models";
import { getBackendURL } from '../utils/api';

export default function Administration() {
  const [user] = useContext(UserContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // For player reservations management
  const [playerReservations, setPlayerReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  
  // For club fields management
  const [clubFields, setClubFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldBookings, setFieldBookings] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [fieldFormData, setFieldFormData] = useState({
    name: '',
    floor_type: '',
    size: '',
    location: '',
    ceiling_height: '',
    lighting: ''
  });
  const [bookingFormData, setBookingFormData] = useState({
    title: '',
    day_of_week: '',
    start_time: '',
    end_time: ''
  });
  
  // For subscription assignment
  const [availableOffers, setAvailableOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState(30);
  const [playerSubscriptions, setPlayerSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  useEffect(() => {
    if (!user?.authenticated || user?.role?.toUpperCase() !== 'ADMIN') {
      navigate("/login");
      return;
    }
  }, []);

  // Fetch users based on search criteria
  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const backendURL = getBackendURL();
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(
        `${backendURL}/admin/users/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Greška pri učitavanju korisnika");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  // Open edit modal
  const openEditModal = async (userToEdit) => {
    setSelectedUser(userToEdit);
    setEditFormData(userToEdit.profile || {});
    setIsEditModalOpen(true);
    
    // Fetch additional data based on user role
    if (userToEdit.role === "PLAYER") {
      await fetchPlayerReservations(userToEdit.id);
      await fetchAllOffers();
      await fetchPlayerSubscriptions(userToEdit.id);
    } else if (userToEdit.role === "CLUB") {
      await fetchClubFields(userToEdit.id);
    }
  };

  // Open delete modal
  const openDeleteModal = (userToDelete) => {
    setSelectedUser(userToDelete);
    setIsDeleteModalOpen(true);
  };

  // Close modals
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setEditFormData({});
    setPlayerReservations([]);
    setClubFields([]);
    setSelectedField(null);
    setFieldBookings([]);
    setAvailableOffers([]);
    setPlayerSubscriptions([]);
    setSelectedOffer('');
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };
  
  // Fetch all available offers for subscription assignment
  const fetchAllOffers = async () => {
    setLoadingOffers(true);
    setError("");
    try {
      const backendURL = getBackendURL();
      
      // First, get all clubs
      const response = await fetch(`${backendURL}/search/?q=&type=CLUB&includeAllClubs=true`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allOffers = [];
        
        // Fetch offers for each club
        if (data.clubs && data.clubs.length > 0) {
          for (const club of data.clubs) {
            try {
              const offersResponse = await fetch(`${backendURL}/clubs/${club.id}/offers/`, {
                headers: {
                  Authorization: `Bearer ${user.accessToken}`,
                },
              });
              if (offersResponse.ok) {
                const offersData = await offersResponse.json();
                if (offersData.offers && offersData.offers.length > 0) {
                  // Add club name to each offer
                  offersData.offers.forEach(offer => {
                    allOffers.push({
                      ...offer,
                      club_name: club.name,
                      club_id: club.id
                    });
                  });
                }
              }
            } catch (e) {
              console.error(`Error fetching offers for club ${club.id}:`, e);
            }
          }
        }
        
        setAvailableOffers(allOffers);
      }
    } catch (err) {
      console.error("Error fetching offers:", err);
      setError("Greška pri učitavanju ponuda");
    } finally {
      setLoadingOffers(false);
    }
  };
  
  // Assign subscription to player
  const handleAssignSubscription = async () => {
    if (!selectedOffer) {
      setError("Molimo odaberite ponudu");
      return;
    }
    
    setError("");
    setSuccessMessage("");
    try {
      const backendURL = getBackendURL();
      const response = await fetch(
        `${backendURL}/admin/players/${selectedUser.id}/assign-subscription/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offer_id: parseInt(selectedOffer),
            duration_days: subscriptionDuration
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška pri dodjeljivanju pretplate");
      }

      setSuccessMessage("Pretplata uspješno dodijeljena!");
      setSelectedOffer('');
      setSubscriptionDuration(30);
      // Refresh subscriptions list
      await fetchPlayerSubscriptions(selectedUser.id);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Fetch player subscriptions
  const fetchPlayerSubscriptions = async (playerId) => {
    setLoadingSubscriptions(true);
    try {
      const backendURL = getBackendURL();
      const response = await fetch(
        `${backendURL}/admin/subscriptions/?player_id=${playerId}&active_only=false`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlayerSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error("Error fetching player subscriptions:", err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };
  
  // Revoke player subscription
  const handleRevokeSubscription = async (subscriptionId) => {
    if (!confirm("Sigurno želite poništiti ovu pretplatu?")) {
      return;
    }
    
    setError("");
    setSuccessMessage("");
    try {
      const backendURL = getBackendURL();
      const response = await fetch(
        `${backendURL}/admin/subscriptions/${subscriptionId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška pri poništavanju pretplate");
      }

      setSuccessMessage("Pretplata uspješno poništena!");
      // Refresh subscriptions list
      await fetchPlayerSubscriptions(selectedUser.id);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save user changes
  const handleSaveEdit = async () => {
    setError("");
    setSuccessMessage("");
    try {
      const backendURL = getBackendURL();
      // For ADMIN users, need different field mapping
      const dataToSend = { ...editFormData };

      // Map front-end field names to back-end field names
      if (selectedUser.role === "PLAYER") {
        dataToSend.skill_level = dataToSend.skill_level || selectedUser.profile?.skill_level;
      }

      const response = await fetch(
        `${backendURL}/admin/users/${selectedUser.id}/update/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška pri ažuriranju korisnika");
      }

      setSuccessMessage("Korisnik je uspješno ažuriran");
      closeEditModal();
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    setError("");
    setSuccessMessage("");
    try {
      const backendURL = getBackendURL();
      const response = await fetch(
        `${backendURL}/admin/users/${selectedUser.id}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Greška pri brisanju korisnika");
      }

      setSuccessMessage("Korisnik je uspješno obrisan");
      closeDeleteModal();
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch player reservations
  const fetchPlayerReservations = async (playerId) => {
    setLoadingReservations(true);
    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/users/${playerId}/reservations/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerReservations((data.reservations || []).map(r => Reservation.fromAPI(r)));
      }
    } catch (err) {
      console.error("Error fetching reservations:", err);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Delete player reservation
  const handleDeleteReservation = async (reservationId) => {
    if (!confirm("Sigurno želite otkazati ovu rezervaciju?")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/reservations/${reservationId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        setSuccessMessage("Rezervacija uspješno otkazana!");
        fetchPlayerReservations(selectedUser.id);
      } else {
        const data = await response.json();
        setError(data.error || "Greška pri otkazivanju rezervacije");
      }
    } catch (err) {
      setError("Greška pri otkazivanju rezervacije");
    }
  };

  // Fetch club fields
  const fetchClubFields = async (clubId) => {
    setLoadingFields(true);
    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/users/${clubId}/fields/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClubFields((data.fields || []).map(f => Field.fromAPI(f)));
      }
    } catch (err) {
      console.error("Error fetching fields:", err);
    } finally {
      setLoadingFields(false);
    }
  };

  // Fetch field bookings
  const fetchFieldBookings = async (fieldId) => {
    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/fields/${fieldId}/bookings/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFieldBookings((data.bookings || []).map(b => Booking.fromAPI(b)));
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  // View field details
  const viewFieldDetails = async (field) => {
    setSelectedField(field);
    await fetchFieldBookings(field.id);
  };

  // Delete field
  const handleDeleteField = async (fieldId) => {
    if (!confirm("Sigurno želite obrisati ovaj teren? Sve rezervacije će biti obrisane.")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/fields/${fieldId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        setSuccessMessage("Teren uspješno obrisan!");
        fetchClubFields(selectedUser.id);
        setSelectedField(null);
        setFieldBookings([]);
      } else {
        const data = await response.json();
        setError(data.error || "Greška pri brisanju terena");
      }
    } catch (err) {
      setError("Greška pri brisanju terena");
    }
  };

  // Delete booking
  const handleDeleteBooking = async (fieldId, bookingId) => {
    if (!confirm("Sigurno želite obrisati ovaj booking?")) {
      return;
    }

    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/bookings/${bookingId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      if (response.ok) {
        setSuccessMessage("Booking uspješno obrisan!");
        fetchFieldBookings(fieldId);
      } else {
        const data = await response.json();
        setError(data.error || "Greška pri brisanju bookinga");
      }
    } catch (err) {
      setError("Greška pri brisanju bookinga");
    }
  };

  // Edit field
  const handleEditField = (field) => {
    setEditingField(field);
    setFieldFormData({
      name: field.name,
      floor_type: field.floorType,
      size: field.size,
      location: field.location,
      ceiling_height: field.ceilingHeight,
      lighting: field.lighting
    });
  };

  // Update field
  const handleUpdateField = async () => {
    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/fields/${editingField.id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify(fieldFormData)
      });

      if (response.ok) {
        setSuccessMessage('Teren uspješno ažuriran!');
        setEditingField(null);
        // Refresh the fields list
        fetchClubFields(selectedUser.id);
        // Update selectedField with new data
        const data = await response.json();
        setSelectedField(Field.fromAPI(data.field));
      } else {
        const data = await response.json();
        setError(data.error || 'Greška pri ažuriranju terena');
      }
    } catch (err) {
      setError('Greška pri ažuriranju terena');
    }
  };

  // Edit booking
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingFormData({
      title: booking.title,
      day_of_week: booking.dayOfWeek,
      start_time: booking.startTime,
      end_time: booking.endTime
    });
  };

  // Update booking
  const handleUpdateBooking = async () => {
    try {
      const backendURL = getBackendURL();
      const response = await fetch(`${backendURL}/admin/bookings/${editingBooking.id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify(bookingFormData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('Booking uspješno ažuriran!');
        setEditingBooking(null);
        // Refresh the bookings list
        if (selectedField) {
          fetchFieldBookings(selectedField.id);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Greška pri ažuriranju bookinga');
      }
    } catch (err) {
      setError('Greška pri ažuriranju bookinga');
    }
  };

  // Render role-specific edit form fields
  const renderEditFields = () => {
    const userRole = selectedUser?.role;

    if (userRole === "PLAYER") {
      return (
        <>
          <h3>Informacije profila</h3>
          <div style={styles.formGroup}>
            <label>Ime:</label>
            <input
              type="text"
              name="first_name"
              value={editFormData.first_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Prezime:</label>
            <input
              type="text"
              name="last_name"
              value={editFormData.last_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Broj telefona:</label>
            <input
              type="text"
              name="phone_number"
              value={editFormData.phone_number || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Razina vještine:</label>
            <select
              name="skill_level"
              value={editFormData.skill_level || ""}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="">Odaberite</option>
              <option value="BEGINNER">Početnik</option>
              <option value="INTERMEDIATE">Srednji nivo</option>
              <option value="ADVANCED">Napredni</option>
              <option value="PROFESSIONAL">Profesionalac</option>
            </select>
          </div>

          <hr style={{margin: "20px 0"}} />
          <h3>Rezervacije igrača</h3>
          {loadingReservations ? (
            <p>Učitavanje rezervacija...</p>
          ) : playerReservations.length === 0 ? (
            <p style={{color: "#666"}}>Igrač nema aktivnih rezervacija.</p>
          ) : (
            <div style={styles.reservationsSection}>
              {playerReservations.map((reservation) => {
                const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
                const dayIndex = reservation.dayOfWeek || 0;
                
                return (
                  <div key={reservation.id} style={styles.reservationCard}>
                    <div>
                      <strong>{reservation.bookingTitle || 'N/A'}</strong>
                      <br />
                      <span style={{fontSize: "14px", color: "#666"}}>
                        {reservation.fieldName || 'N/A'} - {reservation.clubName || 'N/A'}
                      </span>
                      <br />
                      <span style={{fontSize: "14px", color: "#666"}}>
                        {dayNames[dayIndex]} {reservation.startTime || 'N/A'}-{reservation.endTime || 'N/A'}
                      </span>
                      <br />
                      <span style={{fontSize: "12px", color: "#888"}}>
                        Datum: {reservation.date || 'N/A'}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={styles.deleteButtonSmall}
                      onClick={() => handleDeleteReservation(reservation.id)}
                    >
                      Otkaži
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          <hr style={{margin: "20px 0"}} />
          <h3>Aktivne pretplate</h3>
          {loadingSubscriptions ? (
            <p>Učitavanje pretplata...</p>
          ) : playerSubscriptions.length === 0 ? (
            <p style={{color: "#666"}}>Igrač nema aktivnih pretplata.</p>
          ) : (
            <div style={styles.reservationsSection}>
              {playerSubscriptions.map((subscription) => {
                const isActive = subscription.is_active && !subscription.is_expired;
                const expiresDate = new Date(subscription.expires_at);
                
                return (
                  <div key={subscription.id} style={{
                    ...styles.reservationCard,
                    backgroundColor: isActive ? 'white' : '#f8f9fa',
                    opacity: isActive ? 1 : 0.7
                  }}>
                    <div>
                      <strong>{subscription.offer.name}</strong>
                      {!isActive && <span style={{color: '#dc3545', marginLeft: '8px', fontSize: '12px'}}>(Neaktivno)</span>}
                      <br />
                      <span style={{fontSize: "14px", color: "#666"}}>
                        Klub: {subscription.offer.club}
                      </span>
                      <br />
                      <span style={{fontSize: "14px", color: "#666"}}>
                        Popust: {subscription.offer.discount_percentage || 0}% • Cijena: {subscription.offer.price}€/mj
                      </span>
                      <br />
                      <span style={{fontSize: "12px", color: "#888"}}>
                        Status plaćanja: {subscription.payment_status}
                      </span>
                      <br />
                      <span style={{fontSize: "12px", color: subscription.is_expired ? '#dc3545' : '#28a745'}}>
                        Ističe: {expiresDate.toLocaleDateString('hr-HR')} {expiresDate.toLocaleTimeString('hr-HR', {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>
                    {isActive && (
                      <button
                        type="button"
                        style={styles.deleteButtonSmall}
                        onClick={() => handleRevokeSubscription(subscription.id)}
                      >
                        Poništi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <hr style={{margin: "20px 0"}} />
          <h3>Dodijeli pretplatu</h3>
          {loadingOffers ? (
            <p>Učitavanje ponuda...</p>
          ) : (
            <div style={{padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "5px"}}>
              <div style={styles.formGroup}>
                <label>Odaberi ponudu:</label>
                <select
                  value={selectedOffer}
                  onChange={(e) => setSelectedOffer(e.target.value)}
                  style={styles.input}
                >
                  <option value="">-- Odaberi ponudu --</option>
                  {availableOffers.filter(o => o.offer_type === 'SUBSCRIPTION').map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name} - {offer.club_name} ({offer.monthly_price}€/mj, {offer.discount_percentage}% popust)
                    </option>
                  ))}
                </select>
                {availableOffers.length === 0 && (
                  <small style={{color: "#dc3545", marginTop: "5px"}}>
                    Nema dostupnih ponuda. Klubovi prvo moraju kreirati pretplate.
                  </small>
                )}
                {availableOffers.length > 0 && availableOffers.filter(o => o.offer_type === 'SUBSCRIPTION').length === 0 && (
                  <small style={{color: "#dc3545", marginTop: "5px"}}>
                    Nema dostupnih pretplata. Ukupno ponuda: {availableOffers.length}
                  </small>
                )}
              </div>
              <div style={styles.formGroup}>
                <label>Trajanje (dani):</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={subscriptionDuration}
                  onChange={(e) => setSubscriptionDuration(parseInt(e.target.value))}
                  style={styles.input}
                />
              </div>
              <button
                type="button"
                style={{...styles.saveButton, marginTop: "10px"}}
                onClick={handleAssignSubscription}
                disabled={!selectedOffer}
              >
                Dodijeli pretplatu
              </button>
            </div>
          )}
        </>
      );
    } else if (userRole === "CLUB") {
      return (
        <>
          <h3>Informacije profila</h3>
          <div style={styles.formGroup}>
            <label>Naziv kluba:</label>
            <input
              type="text"
              name="name"
              value={editFormData.name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Adresa:</label>
            <input
              type="text"
              name="address"
              value={editFormData.address || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Opis:</label>
            <textarea
              name="description"
              value={editFormData.description || ""}
              onChange={handleInputChange}
              style={{ ...styles.input, minHeight: "100px" }}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Radno vrijeme:</label>
            <input
              type="text"
              name="working_hours"
              value={editFormData.working_hours || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Broj telefona:</label>
            <input
              type="text"
              name="contact_number"
              value={editFormData.contact_number || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <hr style={{margin: "20px 0"}} />
          <h3>Tereni kluba</h3>
          {loadingFields ? (
            <p>Učitavanje terena...</p>
          ) : clubFields.length === 0 ? (
            <p style={{color: "#666"}}>Klub nema dodanih terena.</p>
          ) : (
            <div style={styles.fieldsSection}>
              {clubFields.map((field) => (
                <div key={field.id} style={styles.fieldCard}>
                  <div style={{flex: 1}}>
                    <strong>{field.name}</strong>
                    <br />
                    <span style={{fontSize: "14px", color: "#666"}}>
                      {field.floor_type || field.floorType} • {field.size} • {field.location}
                    </span>
                  </div>
                  <div style={{display: "flex", gap: "0.5rem"}}>
                    <button
                      type="button"
                      style={styles.viewButton}
                      onClick={() => viewFieldDetails(field)}
                    >
                      Detalji
                    </button>
                    <button
                      type="button"
                      style={styles.deleteButtonSmall}
                      onClick={() => handleDeleteField(field.id)}
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              ))}

              {selectedField && (
                <div style={styles.fieldDetailsSection}>
                  <h4>Detalji terena: {selectedField.name}</h4>
                  
                  {/* Field properties edit */}
                  {editingField ? (
                    <div style={{marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "5px"}}>
                      <h5>Uredi svojstva terena</h5>
                      <div style={styles.formGroup}>
                        <label>Naziv:</label>
                        <input
                          type="text"
                          value={fieldFormData.name}
                          onChange={(e) => setFieldFormData({...fieldFormData, name: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Tip poda:</label>
                        <input
                          type="text"
                          value={fieldFormData.floor_type}
                          onChange={(e) => setFieldFormData({...fieldFormData, floor_type: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Veličina:</label>
                        <input
                          type="text"
                          value={fieldFormData.size}
                          onChange={(e) => setFieldFormData({...fieldFormData, size: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Lokacija:</label>
                        <input
                          type="text"
                          value={fieldFormData.location}
                          onChange={(e) => setFieldFormData({...fieldFormData, location: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Visina stropa:</label>
                        <input
                          type="text"
                          value={fieldFormData.ceiling_height}
                          onChange={(e) => setFieldFormData({...fieldFormData, ceiling_height: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Osvjetljenje:</label>
                        <input
                          type="text"
                          value={fieldFormData.lighting}
                          onChange={(e) => setFieldFormData({...fieldFormData, lighting: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={{display: "flex", gap: "10px"}}>
                        <button type="button" style={styles.saveButton} onClick={handleUpdateField}>
                          Spremi
                        </button>
                        <button type="button" style={styles.cancelButton} onClick={() => setEditingField(null)}>
                          Odustani
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "5px"}}>
                      <p><strong>Naziv:</strong> {selectedField.name}</p>
                      <p><strong>Tip poda:</strong> {selectedField.floorType || selectedField.floor_type}</p>
                      <p><strong>Veličina:</strong> {selectedField.size}</p>
                      <p><strong>Lokacija:</strong> {selectedField.location}</p>
                      <p><strong>Visina stropa:</strong> {selectedField.ceilingHeight || selectedField.ceiling_height}</p>
                      <p><strong>Osvjetljenje:</strong> {selectedField.lighting}</p>
                      <button type="button" style={styles.viewButton} onClick={() => handleEditField(selectedField)}>
                        Uredi teren
                      </button>
                    </div>
                  )}

                  {/* Calendar view */}
                  <div style={{marginBottom: "20px"}}>
                    <h5>Kalendar bookinga</h5>
                    <FullCalendar
                      plugins={[timeGridPlugin, interactionPlugin]}
                      initialView="timeGridWeek"
                      headerToolbar={{
                        left: '',
                        center: '',
                        right: ''
                      }}
                      firstDay={1}
                      allDaySlot={false}
                      slotMinTime="06:00:00"
                      slotMaxTime="23:00:00"
                      slotDuration="00:30:00"
                      height="auto"
                      events={fieldBookings.map(booking => ({
                        id: booking.id,
                        title: booking.title,
                        daysOfWeek: [(booking.dayOfWeek + 1) % 7],
                        startTime: booking.startTime,
                        endTime: booking.endTime,
                        extendedProps: {
                          bookingData: booking
                        }
                      }))}
                      eventClick={(info) => handleEditBooking(info.event.extendedProps.bookingData)}
                      eventContent={(arg) => (
                        <div style={{padding: "2px 5px", cursor: "pointer"}}>
                          <div style={{fontWeight: "bold", fontSize: "12px"}}>{arg.event.title}</div>
                          <div style={{fontSize: "10px"}}>{arg.timeText}</div>
                        </div>
                      )}
                    />
                  </div>

                  {/* Booking edit form */}
                  {editingBooking && (
                    <div style={{marginBottom: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "5px"}}>
                      <h5>Uredi booking</h5>
                      <div style={styles.formGroup}>
                        <label>Naziv:</label>
                        <input
                          type="text"
                          value={bookingFormData.title}
                          onChange={(e) => setBookingFormData({...bookingFormData, title: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Dan u tjednu:</label>
                        <select
                          value={bookingFormData.day_of_week}
                          onChange={(e) => setBookingFormData({...bookingFormData, day_of_week: e.target.value})}
                          style={styles.input}
                        >
                          <option value="0">Nedjelja</option>
                          <option value="1">Ponedjeljak</option>
                          <option value="2">Utorak</option>
                          <option value="3">Srijeda</option>
                          <option value="4">Četvrtak</option>
                          <option value="5">Petak</option>
                          <option value="6">Subota</option>
                        </select>
                      </div>
                      <div style={styles.formGroup}>
                        <label>Početak:</label>
                        <input
                          type="time"
                          value={bookingFormData.start_time}
                          onChange={(e) => setBookingFormData({...bookingFormData, start_time: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Kraj:</label>
                        <input
                          type="time"
                          value={bookingFormData.end_time}
                          onChange={(e) => setBookingFormData({...bookingFormData, end_time: e.target.value})}
                          style={styles.input}
                        />
                      </div>
                      <div style={{display: "flex", gap: "10px"}}>
                        <button type="button" style={styles.saveButton} onClick={handleUpdateBooking}>
                          Spremi
                        </button>
                        <button type="button" style={styles.cancelButton} onClick={() => setEditingBooking(null)}>
                          Odustani
                        </button>
                        <button type="button" style={styles.deleteButtonSmall} onClick={() => {
                          handleDeleteBooking(selectedField.id, editingBooking.id);
                          setEditingBooking(null);
                        }}>
                          Obriši
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bookings list */}
                  <h5>Lista bookinga</h5>
                  <button
                    type="button"
                    style={{...styles.cancelButton, marginBottom: "10px"}}
                    onClick={() => {setSelectedField(null); setFieldBookings([]); setEditingField(null); setEditingBooking(null);}}
                  >
                    Zatvori detalje
                  </button>
                  {fieldBookings.length === 0 ? (
                    <p style={{color: "#666"}}>Nema bookings za ovaj teren.</p>
                  ) : (
                    <div>
                      {fieldBookings.map((booking) => {
                        const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
                        return (
                          <div key={booking.id} style={styles.bookingCard}>
                            <div>
                              <strong>{booking.title}</strong>
                              <br />
                              <span style={{fontSize: "14px", color: "#666"}}>
                                {dayNames[booking.day_of_week]} {booking.start_time}-{booking.end_time}
                              </span>
                              {booking.has_reservation && (
                                <>
                                  <br />
                                  <span style={{fontSize: "12px", color: "#28a745", fontWeight: "500"}}>
                                    Rezervirano
                                  </span>
                                </>
                              )}
                            </div>
                            <div style={{display: "flex", gap: "5px"}}>
                              <button
                                type="button"
                                style={styles.viewButton}
                                onClick={() => handleEditBooking(booking)}
                              >
                                Uredi
                              </button>
                              <button
                                type="button"
                                style={styles.deleteButtonSmall}
                                onClick={() => handleDeleteBooking(selectedField.id, booking.id)}
                              >
                                Obriši
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      );
    } else if (userRole === "ADMIN") {
      return (
        <>
          <div style={styles.formGroup}>
            <label>Ime:</label>
            <input
              type="text"
              name="first_name"
              value={editFormData.first_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Prezime:</label>
            <input
              type="text"
              name="last_name"
              value={editFormData.last_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                name="can_manage_users"
                checked={editFormData.can_manage_users || false}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    can_manage_users: e.target.checked,
                  })
                }
              />
              Može upravljati korisnicima
            </label>
          </div>
          <div style={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                name="can_manage_bookings"
                checked={editFormData.can_manage_bookings || false}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    can_manage_bookings: e.target.checked,
                  })
                }
              />
              Može upravljati rezervacijama
            </label>
          </div>
        </>
      );
    }
  };

  // Get display name for user
  const getDisplayName = (userData) => {
    if (userData.profile?.first_name && userData.profile?.last_name) {
      return `${userData.profile.first_name} ${userData.profile.last_name}`;
    } else if (userData.profile?.name) {
      return userData.profile.name;
    }
    return userData.username || userData.email;
  };

  return (
    <div style={styles.container}>
      <h1>Administracija</h1>

      {error && <div style={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div style={styles.successMessage}>{successMessage}</div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchRow}>
          <div style={styles.formGroup}>
            <label>Pretraži korisnike:</label>
            <input
              type="text"
              placeholder="Imena, prezimena ili email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Tip korisnika:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={styles.input}
            >
              <option value="">Svi</option>
              <option value="PLAYER">Igrač</option>
              <option value="CLUB">Klub</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <button type="submit" style={styles.searchButton}>
            Pretraži
          </button>
        </div>
      </form>

      {/* Users List */}
      {loading ? (
        <p>Učitavanje...</p>
      ) : users.length > 0 ? (
        <div style={styles.usersList}>
          {users.map((userData) => (
            <div key={userData.id} style={styles.userCard}>
              <div style={styles.userInfo}>
                <h3>{getDisplayName(userData)}</h3>
                <p style={styles.userMeta}>
                  <strong>Tip:</strong> {User.ROLES_HR[userData.role]}
                </p>
                <p style={styles.userMeta}>
                  <strong>Email:</strong> {userData.email}
                </p>
                <p style={styles.userMeta}>
                  <strong>Korisničko ime:</strong> {userData.username}
                </p>
                {userData.profile?.rating_avg !== undefined && (
                  <p style={styles.userMeta}>
                    <strong>Prosječna ocjena:</strong> {userData.profile.rating_avg}
                  </p>
                )}
              </div>
              {userData.role !== "ADMIN" && (
                <div style={styles.userActions}>
                  <button
                    onClick={() => openEditModal(userData)}
                    style={styles.editButton}
                  >
                    Uredi
                  </button>
                  <button
                    onClick={() => openDeleteModal(userData)}
                    style={styles.deleteButton}
                  >
                    Obriši
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.noResults}>Nema pronađenih korisnika</p>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>Uredi korisnika: {getDisplayName(selectedUser)}</h2>
            <div style={styles.formContainer}>{renderEditFields()}</div>
            <div style={styles.modalActions}>
              <button onClick={handleSaveEdit} style={styles.saveButton}>
                Spremi
              </button>
              <button onClick={closeEditModal} style={styles.cancelButton}>
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModal}>
            <h2>Potvrdi brisanje</h2>
            <p>
              Jeste li sigurni da želite obrisati korisnika{" "}
              <strong>{getDisplayName(selectedUser)}</strong>?
            </p>
            <p style={styles.warningText}>Ova akcija se ne može vratiti.</p>
            <div style={styles.modalActions}>
              <button
                onClick={handleDeleteUser}
                style={styles.deleteConfirmButton}
              >
                Obriši
              </button>
              <button onClick={closeDeleteModal} style={styles.cancelButton}>
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem",
  },
  searchForm: {
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    marginBottom: "2rem",
  },
  searchRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 200px",
  },
  input: {
    padding: "0.6rem",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    marginTop: "0.3rem",
  },
  searchButton: {
    padding: "0.6rem 1.5rem",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  usersList: {
    display: "grid",
    gap: "1rem",
  },
  userCard: {
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  userInfo: {
    flex: 1,
  },
  userMeta: {
    margin: "0.3rem 0",
    fontSize: "0.95rem",
    color: "#666",
  },
  userActions: {
    display: "flex",
    gap: "0.5rem",
    marginLeft: "1rem",
  },
  editButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  deleteButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  noResults: {
    textAlign: "center",
    color: "#999",
    padding: "2rem",
    fontSize: "1.1rem",
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "1rem",
    borderRadius: "4px",
    marginBottom: "1rem",
    border: "1px solid #f5c6cb",
  },
  successMessage: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "1rem",
    borderRadius: "4px",
    marginBottom: "1rem",
    border: "1px solid #c3e6cb",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "900px",
    width: "90%",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  confirmModal: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: "1.5rem",
    maxHeight: "60vh",
    overflowY: "auto",
  },
  modalActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginTop: "1.5rem",
  },
  saveButton: {
    padding: "0.7rem 1.5rem",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
  },
  deleteConfirmButton: {
    padding: "0.7rem 1.5rem",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
  },
  cancelButton: {
    padding: "0.7rem 1.5rem",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
  },
  warningText: {
    color: "#dc3545",
    fontWeight: "500",
    marginTop: "1rem",
  },
  reservationsSection: {
    backgroundColor: "#f8f9fa",
    padding: "1rem",
    borderRadius: "4px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  reservationCard: {
    backgroundColor: "white",
    padding: "0.75rem",
    marginBottom: "0.5rem",
    borderRadius: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #dee2e6",
  },
  fieldsSection: {
    backgroundColor: "#f8f9fa",
    padding: "1rem",
    borderRadius: "4px",
  },
  fieldCard: {
    backgroundColor: "white",
    padding: "0.75rem",
    marginBottom: "0.5rem",
    borderRadius: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #dee2e6",
  },
  fieldDetailsSection: {
    marginTop: "1rem",
    padding: "1rem",
    backgroundColor: "#e9ecef",
    borderRadius: "4px",
  },
  bookingCard: {
    backgroundColor: "white",
    padding: "0.75rem",
    marginBottom: "0.5rem",
    borderRadius: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #dee2e6",
  },
  deleteButtonSmall: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  viewButton: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
};
