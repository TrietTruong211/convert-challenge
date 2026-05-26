import './scss/main.scss';
import Alpine from 'alpinejs';
import LookbookSection from './components/LookbookSection';

Alpine.data('lookbookSection', LookbookSection);

window.Alpine = Alpine;
Alpine.start();
