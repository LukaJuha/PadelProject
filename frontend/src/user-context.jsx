import { createContext, useState } from "react";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    // user = { name: "Guest", role: "Guest", email: null, authenticated: false }
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider> 
  );
}

export default UserContext;