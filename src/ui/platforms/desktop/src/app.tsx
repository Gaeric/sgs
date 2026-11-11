import { getAudioLoader } from 'audio_loader/audio_loader_util';
import { Sanguosha } from 'core/game/engine';
import { Logger } from 'core/shares/libs/logger/logger';
import { ClientTranslationModule } from 'core/translations/translation_module.client';
import { ElectronLoader } from 'electron_loader/electron_loader';
import { getImageLoader } from 'image_loader/image_loader_util';
import * as mobxReact from 'mobx-react';
import { CharactersList } from 'pages/characters_list/characters_list';
import { OpenningPage } from 'pages/openning/openning';
import { ReplayRoomPage } from 'pages/room/replay_room';
import { RoomPage } from 'pages/room/room';
import { WaitingRoom } from 'pages/waiting_room/waiting_room';
import { ClientConfig } from 'props/config_props';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageRoute, PageRoutingProvider } from 'routing/page_route';
import { isGameRoomRoute, isReplayRoute, isWaitingRoomRoute } from 'routing/route_state';
import { CampaignService } from 'services/campaign_service/campaign_service';
import { getConnectionService } from 'services/connection_service/connection_service_util';
import { CharacterSkinInfo } from 'skins/skins';
import { installEventEmitter } from 'utils/install_event_emitter';
import { Lobby } from './pages/lobby/lobby';

@mobxReact.observer
export class App extends React.PureComponent<{
  config: ClientConfig;
  electronLoader: ElectronLoader;
  translator: ClientTranslationModule;
  logger: Logger;
}> {
  private skinData?: CharacterSkinInfo[];
  private imageLoader = getImageLoader(this.props.config.flavor);
  private audioLoader = getAudioLoader(this.props.config.flavor);
  private connectionService = getConnectionService(this.props.config);
  private fakeConnectionService = getConnectionService(this.props.config, true);
  private campaignService = new CampaignService(this.props.logger, this.props.config.flavor);

  componentDidMount() {
    document.title = this.props.translator.tr('New QSanguosha') + ' - ' + Sanguosha.Version;
    installEventEmitter();
  }

  private readonly getConnectionService = (campaignMode: boolean) =>
    campaignMode ? this.fakeConnectionService : this.connectionService;

  render() {
    return (
      <PageRoutingProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/openning" replace />} />
          <Route
            path="/openning"
            element={
              <PageRoute
                render={routing => <OpenningPage {...routing} config={this.props.config} logger={this.props.logger} />}
              />
            }
          />
          <Route
            path="/lobby"
            element={
              this.props.electronLoader ? (
                <PageRoute
                  render={routing => (
                    <Lobby
                      {...routing}
                      config={this.props.config}
                      translator={this.props.translator}
                      logger={this.props.logger}
                      imageLoader={this.imageLoader}
                      audioLoader={this.audioLoader}
                      electronLoader={this.props.electronLoader}
                      connectionService={this.connectionService}
                      campaignService={this.campaignService}
                    />
                  )}
                />
              ) : (
                <Navigate to="/openning" replace />
              )
            }
          />
          <Route
            path="/replay"
            element={
              <PageRoute
                validate={isReplayRoute}
                remount
                render={routing => (
                  <ReplayRoomPage
                    {...routing}
                    skinData={this.skinData}
                    imageLoader={this.imageLoader}
                    audioLoader={this.audioLoader}
                    electronLoader={this.props.electronLoader}
                    config={this.props.config}
                    translator={this.props.translator}
                    connectionService={this.fakeConnectionService}
                    logger={this.props.logger}
                  />
                )}
              />
            }
          />
          <Route
            path="/characters"
            element={
              <PageRoute
                render={routing => (
                  <CharactersList
                    {...routing}
                    skinData={this.skinData}
                    imageLoader={this.imageLoader}
                    audioLoader={this.audioLoader}
                    electronLoader={this.props.electronLoader}
                    config={this.props.config}
                    translator={this.props.translator}
                    logger={this.props.logger}
                  />
                )}
              />
            }
          />
          <Route
            path="/waiting-room/:slug"
            element={
              <PageRoute
                validate={isWaitingRoomRoute}
                remount
                render={routing => (
                  <WaitingRoom
                    {...routing}
                    imageLoader={this.imageLoader}
                    audioLoader={this.audioLoader}
                    electronLoader={this.props.electronLoader}
                    config={this.props.config}
                    translator={this.props.translator}
                    getConnectionService={this.getConnectionService}
                    logger={this.props.logger}
                  />
                )}
              />
            }
          />
          <Route
            path="/room/:slug"
            element={
              <PageRoute
                validate={isGameRoomRoute}
                remount
                render={routing => (
                  <RoomPage
                    {...routing}
                    skinData={this.skinData}
                    imageLoader={this.imageLoader}
                    audioLoader={this.audioLoader}
                    electronLoader={this.props.electronLoader}
                    config={this.props.config}
                    translator={this.props.translator}
                    getConnectionService={this.getConnectionService}
                    logger={this.props.logger}
                  />
                )}
              />
            }
          />
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </PageRoutingProvider>
    );
  }
}
