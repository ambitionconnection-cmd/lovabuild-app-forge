import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoutePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/?mode=route", { replace: true });
  }, [navigate]);

  return null;
};

export default RoutePage;