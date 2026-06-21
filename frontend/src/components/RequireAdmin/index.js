import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuth from 'src/hooks/useAuth';

const RequireAdmin = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboards" replace />;
  }

  return <>{children}</>;
};

RequireAdmin.propTypes = {
  children: PropTypes.node
};

export default RequireAdmin;
