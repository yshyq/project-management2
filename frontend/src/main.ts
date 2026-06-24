import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { loadTheme } from "./theme/theme";
import "./styles.css";

loadTheme();
createApp(App).use(createPinia()).use(router).mount("#app");
