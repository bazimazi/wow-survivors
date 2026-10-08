/** Standard Gamepad API button positions; labels describe Xbox / PlayStation. */
export const CONTROLLER_BINDINGS = [
  {
    button: 7,
    action: "shoot",
    label: "RT / R2",
    description: "Equipment attack / next menu control",
  },
  {
    button: 0,
    action: "active",
    label: "A / ×",
    description: "Class ability / confirm",
  },
  { button: 1, action: "dash", label: "B / ○", description: "Dash / back" },
  { button: 2, action: "heal", label: "X / □", description: "Healing supply" },
  { button: 3, action: "bomb", label: "Y / △", description: "Crafted bomb" },
  {
    button: 4,
    action: "interact",
    label: "LB / L1",
    description: "Landmark / previous camp tab",
  },
  {
    button: 5,
    action: "travel",
    label: "RB / R1",
    description: "Travel / next camp tab",
  },
  {
    button: 8,
    action: "fieldwork",
    label: "VIEW",
    description: "Gathering compass (View / Create)",
  },
  {
    button: 9,
    action: "pause",
    label: "MENU",
    description: "Pause / resume (Menu / Options)",
  },
] as const;
export type Direction = "up" | "down" | "left" | "right";
export interface ControllerDevice {
  index: number;
  id: string;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}
export interface ControllerSample {
  movement: { x: number; y: number };
  scroll: number;
  pressed: number[];
  direction: Direction | null;
  activity: boolean;
  disconnected: boolean;
}
const finiteAxis = (value = 0) =>
  Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
export function controllerStick(x = 0, y = 0) {
  x = finiteAxis(x);
  y = finiteAxis(y);
  const length = Math.hypot(x, y);
  if (length <= 0.2) return { x: 0, y: 0 };
  const strength = (Math.min(1, length) - 0.2) / 0.8;
  return { x: (x / length) * strength, y: (y / length) * strength };
}
const down = (pad: ControllerDevice, index: number) => {
  const b = pad.buttons[index];
  return !!b && (b.pressed || (Number.isFinite(b.value) && b.value > 0.5));
};
function state(pad: ControllerDevice) {
  // Ignore auxiliary/vendor buttons; they must not hold the neutral gate open.
  const buttons = Array.from({ length: 16 }, (_, i) => down(pad, i));
  const stick = controllerStick(pad.axes[0], pad.axes[1]);
  const dx = Number(buttons[15]) - Number(buttons[14]);
  const dy = Number(buttons[13]) - Number(buttons[12]);
  const length = Math.hypot(dx, dy) || 1;
  const movement = dx || dy ? { x: dx / length, y: dy / length } : stick;
  const direction: Direction | null =
    Math.max(Math.abs(movement.x), Math.abs(movement.y)) < 0.55
      ? null
      : Math.abs(movement.x) > Math.abs(movement.y)
        ? movement.x > 0
          ? "right"
          : "left"
        : movement.y > 0
          ? "down"
          : "up";
  const right = controllerStick(pad.axes[2], pad.axes[3]);
  return {
    buttons,
    movement,
    direction,
    scroll: right.y,
    activity:
      buttons.some(Boolean) || !!(stick.x || stick.y || right.x || right.y),
  };
}
const emptySample = (disconnected = false): ControllerSample => ({
  movement: { x: 0, y: 0 },
  scroll: 0,
  pressed: [],
  direction: null,
  activity: false,
  disconnected,
});

/** Browser-independent sampling, single-device ownership and transition safety. */
export class ControllerInput {
  index: number | null = null;
  private deviceId = "";
  private buttons: boolean[] = [];
  private neutralRequired = true;
  private direction: Direction | null = null;
  private repeatAt = 0;

  requireNeutral() {
    this.neutralRequired = true;
    this.direction = null;
  }

  sample(
    devices: readonly (ControllerDevice | null)[],
    now: number,
    enabled = true,
  ): ControllerSample {
    const eligible = devices.filter(
      (p): p is ControllerDevice =>
        !!p && p.connected && p.mapping === "standard",
    );
    let pad = eligible.find(
      (p) => p.index === this.index && p.id === this.deviceId,
    );
    if (this.index !== null && !pad) {
      this.index = null;
      this.deviceId = "";
      this.buttons = [];
      this.requireNeutral();
      // Do not hand a lost controller's active expedition to another device.
      return emptySample(true);
    }
    if (!pad && enabled) {
      pad = eligible.find((p) => state(p).activity);
      if (pad) {
        this.index = pad.index;
        this.deviceId = pad.id;
        this.requireNeutral();
      }
    }
    if (!pad) return emptySample();
    const current = state(pad);
    if (!enabled) {
      this.requireNeutral();
      this.buttons = current.buttons;
      return emptySample();
    }
    if (this.neutralRequired) {
      this.buttons = current.buttons;
      if (!current.activity) this.neutralRequired = false;
      return emptySample();
    }
    const pressed = current.buttons.flatMap((value, i) =>
      value && !this.buttons[i] ? [i] : [],
    );
    this.buttons = current.buttons;
    let direction: Direction | null = null;
    if (current.direction !== this.direction) {
      this.direction = current.direction;
      direction = current.direction;
      this.repeatAt = now + 350;
    } else if (current.direction && now >= this.repeatAt) {
      direction = current.direction;
      this.repeatAt = now + 120;
    }
    return { ...current, pressed, direction, disconnected: false };
  }
}
