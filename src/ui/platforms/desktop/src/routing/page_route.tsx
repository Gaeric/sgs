import * as React from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import type { PageRoutingProps } from 'types/page_props';

const CurrentLocation = React.createContext<(() => Location) | undefined>(undefined);

export function PageRoutingProvider(props: { children: React.ReactNode }) {
  const location = useLocation();
  const current = React.useRef(location);
  // Update before reconciling route children: outgoing class lifecycles must see
  // the destination, including POP navigation, rather than their old props.
  current.current = location;
  const getCurrentLocation = React.useCallback(() => current.current, []);

  return <CurrentLocation.Provider value={getCurrentLocation}>{props.children}</CurrentLocation.Provider>;
}

// A hook boundary for existing class-based pages; no legacy history/match API.
export function PageRoute(props: {
  render(routing: PageRoutingProps): React.ReactNode;
  validate?(routing: PageRoutingProps): boolean;
  remount?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const getCurrentLocation = React.useContext(CurrentLocation);
  if (!getCurrentLocation) {
    throw new Error('PageRoute must be rendered inside PageRoutingProvider');
  }
  const routing: PageRoutingProps = { location, navigate, params, getCurrentLocation };
  if (props.validate && !props.validate(routing)) {
    return <Navigate to="/lobby" replace />;
  }

  // Room constructors bind sockets to their slug. A new slug must dispose the
  // previous instance instead of merely updating props on an existing page.
  return (
    <React.Fragment key={props.remount ? `${location.pathname}:${location.key}` : undefined}>
      {props.render(routing)}
    </React.Fragment>
  );
}
