/// <reference types="vite/client" />

declare module "xncolorpicker/src/xncolorpicker" {
  namespace XNColorPicker {
    interface Single {
      color: {
        hex: string;
        hsla: string;
        hslav: [string, string, string, string];
        rgba: string;
        rgbav: [string, string, string, string];
      };
      colorType: "single";
    }
    interface Gradient<colorType, angleType> {
      color: {
        arry: {
          angle: angleType;
          colors: { color: string; per: number }[];
          type: colorType;
        };
        str: string;
      };
      colorType: colorType;
    }
    type Color =
      | Single
      | Gradient<"linear-gradient", string>
      | Gradient<"radial-gradient", number>;
  }
  class XNColorPicker {
    constructor(options: {
      color?: string;
      selector: string;
      showprecolor?: boolean;
      prevcolors?: string[] | null;
      showhistorycolor?: boolean;
      historycolornum?: number;
      format?: "rgba" | "hex" | "hsla";
      showPalette?: boolean;
      show?: boolean;
      lang?: "en" | "cn";
      colorTypeOption?: string;
      canMove?: boolean;
      alwaysShow?: boolean;
      autoConfirm?: boolean;
      hideInputer?: boolean;
      hideCancelButton?: boolean;
      hideConfirmButton?: boolean;
      onCancel?: (color: XNColorPicker.Color) => void;
      onChange?: (color: XNColorPicker.Color) => void;
      onConfirm?: (color: XNColorPicker.Color) => void;
    });
  }
  export default XNColorPicker;
}
