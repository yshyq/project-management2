<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal">
      <header class="modal-head">
        <h2>{{ title }}</h2>
        <button class="icon-button" type="button" @click="$emit('close')">×</button>
      </header>
      <slot />
      <footer v-if="$slots.footer" class="modal-actions">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ close: [] }>();
defineProps<{ open: boolean; title: string }>();
</script>
