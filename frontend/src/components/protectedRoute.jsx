import { useContext } from "react";
import { Navigate } from "react-router-dom";
import UserContext from "../user-context";

export default function ProtectedRoute({ children }) {
  const [user] = useContext(UserContext);

  // Don't redirect if user is logging out 
  if (!user?.authenticated && !user?.loggingOut) {
    return <Navigate to="/login" />;
  }

  return children;
}