import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const RoutePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Tell the map to switch to route mode without remounting
    window.dispatchEvent(new CustomEvent('switchToRouteMode'));
    // Navigate to map root (no query params)
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [navigate, location]);

  return null;
};

export default RoutePage;