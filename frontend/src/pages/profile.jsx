import { useState } from "react";
import { useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../user-context";
import "./styles/profile.css";

function Profile() {
  const [user, setUser] = useContext(UserContext);

  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const oldData = useRef(null);

  useEffect(() => {
    const getProfileData = async () => {
      try {
        const backendURL = (import.meta.env.MODE === 'development') ?  import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
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
            const profileData = {
                email: data.email,
                username: data.username || "",
                firstName: data.first_name || "",
                lastName: data.last_name || "",
                phoneNumber: data.phone_number || "",
                skillLevel: data.skill_level || "Beginner",
                preferredDay: data.preferred_dow || 1,
                preferredTime: data.preferred_time || "12:00",
            };

            setUserData(profileData);
            oldData.current = { ...profileData };
        } else if (user.role.toUpperCase() === "CLUB") {
            const profileData = {
                email: data.email,
                username: data.username || "",
                name: data.name || "",
                address: data.address || "",
                phoneNumber: data.contact_number || "",
                description: data.description || "",
                workingHours: data.working_hours || "",
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
            }
            
            const backendURL = (import.meta.env.MODE === 'development') ? import.meta.env.VITE_API_BASE_URL_LOCAL : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
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
                    <label>Username:</label>
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

            {!editing && (
                <div className="profileButtonContainer">
                    <button onClick={startEditing}>Uredi profil</button>
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
