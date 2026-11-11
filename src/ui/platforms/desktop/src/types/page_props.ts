import { Logger } from 'core/shares/libs/logger/logger';
import { ClientConfig } from 'props/config_props';
import type { Location, NavigateFunction, Params } from 'react-router-dom';

export type PageRoutingProps = {
  navigate: NavigateFunction;
  location: Location;
  params: Readonly<Params<string>>;
  // Outgoing pages need the destination during componentWillUnmount, not their
  // previous location prop (for example, lobby -> characters preserves BGM).
  getCurrentLocation(): Location;
};

export type PagePropsWithConfig<T = {}> = T &
  PageRoutingProps & {
    config: ClientConfig;
    logger: Logger;
  };
