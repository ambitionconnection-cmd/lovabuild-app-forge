import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePageTracking } from "@/hooks/usePageTracking";

const RoutePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTracking('route');

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