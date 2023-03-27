import leaflet from "leaflet";
import CustomNode from "./CustomNode";
import { createElement } from "./lib/elements";

export default function ContextMenu({
  map,
  onAdd,
}: {
  map: leaflet.Map;
  onAdd: () => void;
}) {
  let tooltip: leaflet.Tooltip | null = null;

  map.on("contextmenu", (event) => {
    if (tooltip) {
      tooltip.remove();
    }
    const customNodeButton = createElement("button", {
      innerText: "Add Custom Node",
    });
    CustomNode({
      element: customNodeButton,
      map,
      getLastPosition: () => ({
        location: {
          x: event.latlng.lng,
          y: event.latlng.lat,
          z: 0,
        },
        rotation: 0,
      }),
      onAdd,
    });

    const zoomIn = createElement("button", {
      innerText: "Zoom In",
      onclick: () => map.zoomIn(),
    });
    const zoomOut = createElement("button", {
      innerText: "Zoom Out",
      onclick: () => map.zoomOut(),
    });
    const container = createElement("div", {}, [
      customNodeButton,
      zoomIn,
      zoomOut,
    ]);
    tooltip = leaflet
      .tooltip({
        direction: "bottom",
        interactive: true,
        className: "contextmenu",
      })
      .setLatLng(event.latlng)
      .setContent(container)
      .addTo(map);
  });
}