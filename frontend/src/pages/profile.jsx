import { useState } from "react";
import { useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import { Player, Club, Admin } from "../models";
import "./styles/profile.css";
import { getBackendURL } from '../utils/api';

function Profile() {
  const [user, setUser] = useContext(UserContext);

  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const oldData = useRef(null);

  useEffect(() => {
    if (!user?.authenticated) {
      navigate("/login");
      return;
    }

    const getProfileData = async () => {
      try {
        const backendURL = getBackendURL();
        const res = await fetch(backendURL + "/auth/user/", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${user?.accessToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            alert("Session expired, please log in again.");
            navigate("/login");
          } else {
            const data = await res.json();
            alert(data.error || "Greška prilikom dohvaćanja podataka profila");
          }
          return;
        }

        const data = await res.json();

        if (user.role.toUpperCase() === "PLAYER") {
            const playerModel = Player.fromAPI(data);
            const profileData = {
                email: data.email,
                username: data.username || "",
                firstName: playerModel.firstName,
                lastName: playerModel.lastName,
                phoneNumber: playerModel.phoneNumber,
                skillLevel: playerModel.skillLevel || "BEGINNER",
                preferredDay: playerModel.preferredDow || 1,
                preferredTime: playerModel.preferredTime || "12:00",
            };

            setUserData(profileData);
            oldData.current = { ...profileData };
        } else if (user.role.toUpperCase() === "CLUB") {
            const clubModel = Club.fromAPI(data);
            const profileData = {
                email: data.email,
                username: data.username || "",
                name: clubModel.name,
                address: clubModel.address,
                phoneNumber: clubModel.contactNumber,
                description: clubModel.description,
                workingHours: clubModel.workingHours,
            };

            setUserData(profileData);
            oldData.current = { ...profileData };
        } else if (user.role.toUpperCase() === "ADMIN") {
            const adminModel = Admin.fromAPI(data);
            const profileData = {
                email: data.email,
                username: data.username || "",
                firstName: adminModel.firstName,
                lastName: adminModel.lastName,
            };

            setUserData(profileData);
            oldData.current = { ...profileData };
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    if (user?.accessToken) {
      getProfileData();
    } else {
      // navigate("/login");
    }
  }, [user, navigate]);


  const startEditing = () => {
    oldData.current = {...userData};
    setEditing(true);
  }

  const stopEditing = async (save) => {
    if (save) {
        try {
            let body = {};
            if (user.role.toUpperCase() === "PLAYER") {
                body = {
                    username: userData.username,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    phone_number: userData.phoneNumber,
                    skill_level: userData.skillLevel.toUpperCase(),
                    preferred_dow: userData.preferredDay,
                    preferred_time: userData.preferredTime,
                };
            } else if (user.role.toUpperCase() === "CLUB") {
                body = {
                    username: userData.username,
                    name: userData.name,
                    address: userData.address,
                    contact_number: userData.phoneNumber,
                    description: userData.description,
                    working_hours: userData.workingHours,
                };
            } else if (user.role.toUpperCase() === "ADMIN") {
        const adminModel = new Admin({
          firstName: userData.firstName,
          lastName: userData.lastName
        });
        body = {
          username: userData.username,
          ...adminModel.toAPI()
        };
      }
            
      const backendURL = getBackendURL();
            const res = await fetch(backendURL + "/auth/user/update/", {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${user.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
      
            const data = await res.json();

            if (res.ok) {
              const updatedUser = { ...user, ...data }
              setUser(updatedUser);
              setUserData(data);
            } else {
              alert(data.error || "Greška prilikom ažuriranja profila");
            }
          } catch (err) {
            console.error("Error updating profile:", err);
          }
    } else {
        setUserData(JSON.parse(JSON.stringify(oldData.current)));
    }
    setEditing(false);
  }

  return (
    <div>
        <h1>Profil korisnika</h1>

        <form className="profileForm">
            <div className="profileUserContainer">
                <span>
                    <label>Korisničko ime:</label>
                    <input type="text" value={userData?.username || ""} required disabled={!editing} className="profileTextInput" 
                    onChange={(e) => setUserData({...userData, username: e.target.value})} />
                </span>
                <span>
                    <label>Email:</label>
                    <input type="email" value={userData?.email || ""} required disabled className="profileTextInput" />
                </span>
            </div>

            {user.role.toUpperCase() === "PLAYER" && (
                <>
                <div className="profilePlayerContainer">
                    <span>
                        <label>Ime:</label>
                        <input type="text" value={userData?.firstName || ""} disabled={!editing} className="profileTextInput"
                        onChange={(e) => setUserData({...userData, firstName: e.target.value})} />
                    </span>
                    <span>
                        <label>Prezime:</label>
                        <input type="text" value={userData?.lastName || ""} disabled={!editing} className="profileTextInput" 
                        onChange={(e) => setUserData({...userData, lastName: e.target.value})} />
                    </span>
                </div>

                <label>Telefon:</label>
                <input type="tel" value={userData?.phoneNumber} disabled={!editing} className="profileTextInput" 
                onChange={(e) => setUserData({...userData, phoneNumber: e.target.value})} />

                <label>Razina iskustva:</label>
                <div className="profileRadioContainer">
                    <label htmlFor="skillLevelBeginner">
                        <input type="radio" value="Beginner" id="skillLevelBeginner" name="skillLevel"
                        disabled={!editing} checked={userData?.skillLevel === "BEGINNER"} className="profileRadioInput" 
                        onChange={(e) => setUserData({...userData, skillLevel: e.target.value.toUpperCase()})} />
                        <span>Početnik</span>
                    </label>
                    <label htmlFor="skillLevelIntermediate">
                        <input type="radio" value="Intermediate" id="skillLevelIntermediate" name="skillLevel"
                        disabled={!editing} checked={userData?.skillLevel === "INTERMEDIATE"} className="profileRadioInput" 
                        onChange={(e) => setUserData({...userData, skillLevel: e.target.value.toUpperCase()})} />
                        <span>Srednji</span>
                    </label>
                    <label htmlFor="skillLevelAdvanced">
                        <input type="radio" value="Advanced" id="skillLevelAdvanced" name="skillLevel" 
                        disabled={!editing} checked={userData?.skillLevel === "ADVANCED"} className="profileRadioInput" 
                        onChange={(e) => setUserData({...userData, skillLevel: e.target.value.toUpperCase()})} />
                        <span>Napredni</span>
                    </label>
                    <label htmlFor="skillLevelProfessional">
                        <input type="radio" value="Professional" id="skillLevelProfessional" name="skillLevel"
                        disabled={!editing} checked={userData?.skillLevel === "PROFESSIONAL"} className="profileRadioInput" 
                        onChange={(e) => setUserData({...userData, skillLevel: e.target.value.toUpperCase()})} />
                        <span>Profesionalac</span>
                    </label>
                </div>

                <div className="profileSelectContainer">
                    <label>Preferiran dan: </label>
                    <select value={userData?.preferredDay} 
                    onChange={(e) => setUserData({ ...userData, preferredDay: Number(e.target.value) })} disabled={!editing} className="profileSelect" >
                        <option value="1">Ponedjeljak</option>
                        <option value="2">Utorak</option>
                        <option value="3">Srijeda</option>
                        <option value="4">Četvrtak</option>
                        <option value="5">Petak</option>
                        <option value="6">Subota</option>
                        <option value="0">Nedjelja</option>
                    </select>
                </div>

                <label>Preferirano vrijeme:</label>
                <input type="time" value={userData?.preferredTime}
                onChange={(e) => setUserData({ ...userData, preferredTime: e.target.value })} disabled={!editing} className="profileTextInput" />
                </>
            )}

            {user.role.toUpperCase() === "CLUB" && (
                <>
                <div className="profileClubContainer">
                    <span>
                        <label>Ime:</label>
                        <input type="text" value={userData?.name} disabled={!editing} className="profileTextInput"
                        onChange={(e) => setUserData({...userData, name: e.target.value})} />
                    </span>
                    <span>
                        <label>Adresa:</label>
                        <input type="text" value={userData?.address} disabled={!editing} className="profileTextInput" 
                        onChange={(e) => setUserData({...userData, address: e.target.value})} />
                    </span>
                </div>

                <label>Kontakt telefon:</label>
                <input type="tel" value={userData?.phoneNumber} disabled={!editing} className="profileTextInput" 
                onChange={(e) => setUserData({...userData, phoneNumber: e.target.value})} />

                <div>
                    <label htmlFor="clubDescriptionText" className="clubTextAreaLabel">Opis:</label>
                    <textarea value={userData?.description} disabled={!editing} className="profileTextArea" id="clubDescriptionText"
                    onChange={(e) => setUserData({...userData, description: e.target.value})} ></textarea>

                    <label htmlFor="clubWorkingHoursText" className="clubTextAreaLabel">Radno vrijeme:</label>
                    <textarea value={userData?.workingHours} disabled={!editing} className="profileTextArea" id="clubWorkingHoursText"
                    onChange={(e) => setUserData({...userData, workingHours: e.target.value})} ></textarea>
                </div>
                </>
            )}

            {user.role.toUpperCase() === "ADMIN" && (
                <>
                <div className="profilePlayerContainer">
                    <span>
                        <label>Ime:</label>
                        <input type="text" value={userData?.firstName || ""} disabled={!editing} className="profileTextInput"
                        onChange={(e) => setUserData({...userData, firstName: e.target.value})} />
                    </span>
                    <span>
                        <label>Prezime:</label>
                        <input type="text" value={userData?.lastName || ""} disabled={!editing} className="profileTextInput" 
                        onChange={(e) => setUserData({...userData, lastName: e.target.value})} />
                    </span>
                </div>
                </>
            )}

            {user.role.toUpperCase() === "PLAYER" && (
                <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
                    <h3>Moje Pretplate i Tutorstva</h3>
                    <button
                        type="button"
                        onClick={() => navigate('/my-active-offers')}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        <img src="/crown.png" alt="offers" style={{ width: '16px', height: '16px' }} />                       
                    </button>
                </div>
            )}

            {user.role.toUpperCase() === "PLAYER" && (
                <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
                    <h3>Moje Recenzije</h3>
                    <button
                        type="button"
                        onClick={() => navigate(`/reviews/user/${user.userId}`)}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        <img src="/star.png" alt="star" style={{ width: '16px', height: '16px' }} />                       
                    </button>
                </div>
            )}

            {!editing && (
                <div className="profileButtonContainer">
                    <button onClick={startEditing}>Uredi profil</button>
                    {user?.role?.toUpperCase() === 'PLAYER' && (
                        <button onClick={() => navigate('/reservation-history')} style={{ backgroundColor: '#17a2b8' }}>
                            Povijest Rezervacija
                        </button>
                    )}
                </div>
            )}

            {editing && (
                <div className="profileButtonContainer">
                    <button onClick={(e) => {e.preventDefault(); stopEditing(true);}}>Spremi promjene</button>
                    <button onClick={() => stopEditing(false)}>Odustani</button>
                </div>
            )}
        </form>
    </div>
  );
}

export default Profile;
