import { fetchProductsByHandles } from '@/utils/api';

export default function LookbookSection() {
  return {
    loading: true,
    error: false,
    skeletonCount: 4,
    looks: [],

    async init() {
      const handles = JSON.parse(this.$el.dataset.productHandles || '[]');

      if (!handles.length) {
        this.loading = false;
        return;
      }

      const country = this.$el.dataset.country || window.storefrontContext?.country || 'AU';
      this.skeletonCount = handles.length;

      try {
        this.looks = await fetchProductsByHandles(handles, country);
      } catch (error) {
        console.error('[LookbookSection] Failed to fetch products:', error);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },
  };
}
