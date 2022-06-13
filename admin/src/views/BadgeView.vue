<script lang="ts">
import { defineComponent } from "vue";
import XNColorPicker from "xncolorpicker/src/xncolorpicker";

export default defineComponent({
  data: () => ({
    text: "",
    fontColor: "#563d7c",
    backgroundColor: "mediumturquoise",
  }),
  methods: {
    getColor: (color: XNColorPicker.Color) =>
      color.colorType === "single" ? color.color.hex : color.color.str,
    setBackgroundColor(color: XNColorPicker.Color) {
      this.backgroundColor = this.getColor(color);
    },
  },
  mounted() {
    new XNColorPicker({
      color: this.backgroundColor,
      selector: "#colorpicker",
      onCancel: this.setBackgroundColor,
      onChange: this.setBackgroundColor,
      onConfirm: this.setBackgroundColor,
    });
  },
});
</script>

<template>
  <form class="mt-3">
    <div class="mb-3">
      <label for="badgeText" class="form-label">Text</label>
      <input
        type="text"
        class="form-control w-auto"
        id="badgeText"
        placeholder="badge"
        aria-describedby="badgeTextHelpInline"
        :value="text"
      />
      <span id="badgeTextHelpInline" class="form-text">
        Must be 0-16 characters long.
      </span>
    </div>
    <div class="row">
      <div class="col-6">
        <label for="badgeFontColor" class="form-label">Font color</label>
        <input
          type="color"
          class="form-control form-control-color"
          id="badgeFontColor"
          title="Choose your color"
          :value="fontColor"
        />
      </div>
      <div class="col-6">
        <label class="form-label">Background color</label>
        <div id="colorpicker" class="form-control form-control-color"></div>
      </div>
    </div>
  </form>
</template>

<style lang="scss" scoped>
@import "bootstrap/scss/functions";

@import "bootstrap/scss/variables";

@import "bootstrap/scss/maps";
@import "bootstrap/scss/mixins";
@import "bootstrap/scss/root";

@import "bootstrap/scss/utilities";
@import "bootstrap/scss/reboot";
@import "bootstrap/scss/grid";
@import "bootstrap/scss/forms";

@import "bootstrap/scss/utilities/api";
</style>

<style scoped>
#colorpicker {
  height: 3rem;
}
</style>

<style>
.fcolorpicker-curbox {
  height: 100%;
  width: 100%;
}
</style>
