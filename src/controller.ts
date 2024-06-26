import { GAME_CLASS_ID, WINDOWS } from "./lib/config";
import { loadDiscordRPCPlugin } from "./lib/discord-rpc";
import { startNewGameSession } from "./lib/game-sessions";
import { getRunningGameInfo } from "./lib/games";
import { useAccountStore } from "./lib/stores/account";
import {
  closeMainWindow,
  closeWindow,
  getPreferedWindowName,
  moveToOtherScreen,
  restoreWindow,
  toggleWindow,
} from "./lib/windows";
import { promisifyOverwolf } from "./lib/wrapper";

initController();
startNewGameSession();

async function initController() {
  console.log("Init controller");
  const openApp = async (
    event?: overwolf.extensions.AppLaunchTriggeredEvent
  ) => {
    let userId = useAccountStore.getState().userId;
    if (event?.origin === "urlscheme") {
      const matchedUserId = decodeURIComponent(event.parameter).match(
        "userId=([^&]*)"
      );
      const newUserId = matchedUserId ? matchedUserId[1] : null;
      if (newUserId) {
        userId = newUserId;
      }
    }
    if (userId) {
      const accountStore = useAccountStore.getState();
      const response = await fetch(`https://www.th.gl/api/patreon/overwolf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId: "kkgfkggfpkmndnadgkegoheijamdjkeagojfbbfn",
          userId,
        }),
      });
      try {
        const body = (await response.json()) as { previewAccess: boolean };
        if (!response.ok) {
          console.warn(body);
          accountStore.setIsPatron(false);
        } else {
          console.log(`Patreon successfully activated`);
          accountStore.setIsPatron(true, userId, body.previewAccess);
        }
      } catch (err) {
        console.error(err);
        accountStore.setIsPatron(false);
      }
    }

    const runningGameInfo = await getRunningGameInfo(GAME_CLASS_ID);
    if (runningGameInfo) {
      const preferedWindowName = await getPreferedWindowName();
      const windowId = await restoreWindow(preferedWindowName);
      if (preferedWindowName === WINDOWS.DESKTOP) {
        moveToOtherScreen(windowId, runningGameInfo.monitorHandle.value);
      }
    } else {
      restoreWindow(WINDOWS.DESKTOP);
    }
  };
  openApp();

  overwolf.extensions.onAppLaunchTriggered.addListener(openApp);

  overwolf.settings.hotkeys.onPressed.addListener(async (event) => {
    if (event.name === "toggle_app") {
      const preferedWindowName = await getPreferedWindowName();
      toggleWindow(preferedWindowName);
    }
  });

  const discordRPCPlugin = await loadDiscordRPCPlugin("1187047215986909267");

  overwolf.games.onGameInfoUpdated.addListener(async (event) => {
    if (event.runningChanged && event.gameInfo?.classId === GAME_CLASS_ID) {
      const preferedWindowName = await getPreferedWindowName();
      if (event.gameInfo.isRunning) {
        if (preferedWindowName === WINDOWS.OVERLAY) {
          restoreWindow(WINDOWS.OVERLAY);
          closeWindow(WINDOWS.DESKTOP);
        } else {
          restoreWindow(WINDOWS.DESKTOP);
          closeWindow(WINDOWS.OVERLAY);
        }
      } else {
        await promisifyOverwolf(discordRPCPlugin.dispose)();
        if (preferedWindowName === WINDOWS.OVERLAY) {
          closeMainWindow();
        }
      }
    }
  });
}
