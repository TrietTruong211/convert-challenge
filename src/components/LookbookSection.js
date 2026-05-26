import { fetchProductsByHandles } from '@/utils/api';

export default function LookbookSection() {
  return {
    loading: true,
    error: false,
    skeletonCount: 4,
    looks: [],

    async init() {
      let handles;
      try {
        handles = JSON.parse(this.$el.dataset.productHandles || '[]');
      } catch {
        console.error('[LookbookSection] Failed to parse product handles');
        handles = [];
      }

      const currentHandle = this.$el.dataset.currentHandle || null;
      const filteredHandles = currentHandle ? handles.filter((handle) => handle !== currentHandle) : handles;

      if (!filteredHandles.length) {
        this.loading = false;
        return;
      }

      const country = this.$el.dataset.country || window.storefrontContext?.country || 'AU';
      this.skeletonCount = filteredHandles.length;

      try {
        this.looks = await fetchProductsByHandles(filteredHandles, country);
      } catch (error) {
        console.error('[LookbookSection] Failed to fetch products:', error);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },
  };
}
