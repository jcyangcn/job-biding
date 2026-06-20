import { createContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import {
  fetchCurrentUser,
  getStoredAccessToken,
  loginRequest,
  mapApiUser,
  setStoredAccessToken
} from 'src/services/authApi';

const initialAuthState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null
};

const handlers = {
  INITIALIZE: (state, action) => {
    const { isAuthenticated, user } = action.payload;

    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user
    };
  },
  LOGIN: (state, action) => {
    const { user } = action.payload;

    return {
      ...state,
      isAuthenticated: true,
      user
    };
  },
  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    user: null
  })
};

const reducer = (state, action) =>
  handlers[action.type] ? handlers[action.type](state, action) : state;

const AuthContext = createContext({
  ...initialAuthState,
  method: 'JWT',
  login: () => Promise.resolve(),
  logout: () => Promise.resolve()
});

export const AuthProvider = (props) => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialAuthState);

  useEffect(() => {
    const initialize = async () => {
      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        dispatch({
          type: 'INITIALIZE',
          payload: { isAuthenticated: false, user: null }
        });
        return;
      }

      try {
        const user = await fetchCurrentUser(accessToken);
        dispatch({
          type: 'INITIALIZE',
          payload: {
            isAuthenticated: true,
            user: mapApiUser(user)
          }
        });
      } catch (err) {
        console.error(err);
        setStoredAccessToken(null);
        dispatch({
          type: 'INITIALIZE',
          payload: { isAuthenticated: false, user: null }
        });
      }
    };

    initialize();
  }, []);

  const login = async (username, password) => {
    const data = await loginRequest(username, password);
    setStoredAccessToken(data.access_token);
    dispatch({
      type: 'LOGIN',
      payload: {
        user: mapApiUser(data.user)
      }
    });
  };

  const logout = async () => {
    setStoredAccessToken(null);
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        method: 'JWT',
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthContext;
