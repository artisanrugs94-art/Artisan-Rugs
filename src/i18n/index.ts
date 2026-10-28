import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      searchPlaceholder: 'Search tattoo flash, anime, tiger, kewpie rugs...',
      shop: 'Shop',
      favourites: 'Favourites',
      cart: 'Cart',
      you: 'You',
      home: 'Home',
      madeToOrder: 'Made to order',
      productionNotice: 'Made to order. Production and processing takes {{min}}-{{max}} days after order confirmation.',
      selectSize: 'Select a size',
      selectOption: 'Select an option',
      addToCart: 'Add to cart',
      buyNow: 'Buy now',
      messageWhatsapp: 'Message us on WhatsApp',
      freeShipping: 'Free shipping',
      customOrderTitle: 'Want Your Own Tattoo Flash or Anime Idea Tufted?',
      trackOrder: 'Track Order',
      shopManager: 'Shop Manager',
    },
  },
  hi: {
    translation: {
      searchPlaceholder: 'टैटू फ्लैश, एनीमे, टाइगर या कस्टम रग खोजें...',
      shop: 'दुकान',
      favourites: 'पसंदीदा',
      cart: 'कार्ट',
      you: 'आपका खाता',
      home: 'होम',
      madeToOrder: 'ऑर्डर पर तैयार',
      productionNotice: 'ऑर्डर पर हस्तनिर्मित। पुष्टि के बाद निर्माण में {{min}}-{{max}} दिन लगते हैं।',
      selectSize: 'आकार चुनें',
      selectOption: 'एक विकल्प चुनें',
      addToCart: 'कार्ट में जोड़ें',
      buyNow: 'अभी खरीदें',
      messageWhatsapp: 'WhatsApp पर संदेश भेजें',
      freeShipping: 'मुफ़्त डिलीवरी',
      customOrderTitle: 'अपना खुद का टैटू या एनीमे डिज़ाइन बनवाना चाहते हैं?',
      trackOrder: 'ऑर्डर ट्रैक करें',
      shopManager: 'शॉप मैनेजर',
    },
  },
};

const savedLang =
  typeof window !== 'undefined'
    ? localStorage.getItem('kazumi_lang') ||
      (navigator.language?.startsWith('hi') ? 'hi' : 'en')
    : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
