import { createContext, useContext } from 'react';

// English → Marathi strings for the public website. Keys are the English text.
const MR = {
  // header / nav
  'Skip to collection': 'संग्रहाकडे जा',
  'School & institutional uniforms made to order': 'शाळा व संस्थांसाठी ऑर्डरनुसार युनिफॉर्म',
  'Request a quote': 'कोटेशन मागवा', 'Request a Quote': 'कोटेशन मागवा',
  'Collection': 'संग्रह', 'About': 'आमच्याबद्दल', 'Main': 'मुख्य',
  'CRB Uniforms — home': 'CRB युनिफॉर्म्स — मुख्यपृष्ठ', 'Uniforms & Garments': 'युनिफॉर्म्स व गारमेंट्स',
  'Search shirts, skirts, kids wear…': 'शर्ट, स्कर्ट, लहान मुलांचे कपडे शोधा…', 'Search products': 'उत्पादने शोधा',
  'Clear search': 'शोध साफ करा', 'Open menu': 'मेनू उघडा', 'Close menu': 'मेनू बंद करा',
  'Dark mode': 'डार्क मोड', 'Light mode': 'लाइट मोड', 'Switch to dark mode': 'डार्क मोड वापरा', 'Switch to light mode': 'लाइट मोड वापरा',
  'Language': 'भाषा',
  // hero
  'Featured collections': 'निवडक संग्रह', 'Choose slide': 'स्लाइड निवडा', 'Previous slide': 'मागील स्लाइड', 'Next slide': 'पुढील स्लाइड',
  'Slide {n}: {title}': 'स्लाइड {n}: {title}', '{n} of {count}: {title}': '{count} पैकी {n}: {title}',
  'The Uniform Collection': 'युनिफॉर्म संग्रह', 'Dressed for every school day': 'शाळेच्या प्रत्येक दिवसासाठी तयार',
  'Shirts, trousers, skirts and pinafores cut from hard-wearing fabrics and finished to last the whole year.': 'टिकाऊ कापडापासून बनवलेले शर्ट, पँट, स्कर्ट आणि पिनॅफोर — वर्षभर टिकणारे.',
  'View collection': 'संग्रह पहा', 'Tailored to measure': 'मापानुसार शिवलेले', 'Your colours. Your crest. Your fit.': 'तुमचे रंग. तुमचा लोगो. तुमचे माप.',
  'Custom sizing charts, embroidery and trims made to match your institution.': 'तुमच्या संस्थेनुसार साइज चार्ट, भरतकाम आणि ट्रिम्स.',
  'Why CRB': 'CRB का?', 'Fabric first': 'आधी कापड', 'Chosen for comfort, built for wear': 'आरामासाठी निवडलेले, टिकण्यासाठी बनवलेले',
  'Poly-cotton, terry-wool and twill blends selected for colour-fastness and easy care.': 'रंग न जाणारे आणि सहज देखभालीचे पॉली-कॉटन, टेरी-वूल आणि ट्विल कापड.',
  'Kids wear': 'लहान मुलांचे कपडे', 'Soft, easy wear for little learners': 'लहानग्यांसाठी मऊ, सहज घालता येणारे कपडे',
  'Pinafores and grammers designed for comfort, quick dressing and busy school days.': 'आरामदायी, पटकन घालता येणारे पिनॅफोर आणि ग्रामर.',
  'Shop kids wear': 'लहान मुलांचे कपडे पहा', 'Made in our own unit': 'आमच्या स्वतःच्या युनिटमध्ये बनवलेले',
  'Bulk orders, delivered on time': 'मोठ्या ऑर्डर, वेळेवर डिलिव्हरी',
  'From cutting to packing under one roof — consistent quality across every size and every batch.': 'कटिंगपासून पॅकिंगपर्यंत एकाच छताखाली — प्रत्येक साइज आणि बॅचमध्ये एकसारखी गुणवत्ता.',
  // collection
  'Search': 'शोध', 'Shop the range': 'संग्रह पहा', 'Results for “{q}”': '“{q}” साठी निकाल', 'The Collection': 'आमचा संग्रह',
  'Every piece is cut and stitched in our own unit. Choose a style to see sizes and request a quote.': 'प्रत्येक कपडा आमच्या युनिटमध्ये कापला व शिवला जातो. साइज पाहण्यासाठी आणि कोटेशनसाठी स्टाइल निवडा.',
  'Filter by category': 'श्रेणीनुसार निवडा', 'All': 'सर्व', 'Search the collection': 'संग्रहात शोधा',
  'Loading the collection…': 'संग्रह लोड होत आहे…', 'style': 'स्टाइल', 'styles': 'स्टाइल्स', 'in {c}': '{c} मध्ये', 'matching “{q}”': '“{q}” शी जुळणाऱ्या',
  'Please refresh the page.': 'कृपया पेज रिफ्रेश करा.', 'Could not load products': 'उत्पादने लोड करता आली नाहीत',
  'Nothing matches your search just yet.': 'तुमच्या शोधाशी सध्या काहीही जुळत नाही.', 'Clear filters': 'फिल्टर साफ करा',
  'View {name}': '{name} पहा', 'Price on request': 'किंमत विनंतीनुसार', 'Request quote': 'कोटेशन मागवा',
  // categories
  'School Uniform': 'शाळा युनिफॉर्म', 'Kids Wear': 'लहान मुलांचे कपडे', 'Ethnic & Occasion': 'पारंपरिक व समारंभ',
  // about
  'About CRB': 'CRB बद्दल', 'Craftsmanship in every stitch': 'प्रत्येक टाक्यात कारागिरी',
  'We are a uniform and garment manufacturer. Cutting, stitching, buttons, ironing and packing all happen in our own production unit, so every order is made with the same care — whether it is one class or a whole school.':
    'आम्ही युनिफॉर्म व कपडे उत्पादक आहोत. कटिंग, शिलाई, बटणे, इस्त्री आणि पॅकिंग सर्व आमच्या स्वतःच्या युनिटमध्ये होते, त्यामुळे प्रत्येक ऑर्डर — एका वर्गाची असो वा संपूर्ण शाळेची — त्याच काळजीने बनते.',
  'Talk to us about your order': 'तुमच्या ऑर्डरबद्दल आमच्याशी बोला', 'Tailor measuring and cutting fabric': 'शिंपी कापड मोजून कापत आहे',
  'Why choose us': 'आम्हालाच का निवडावे',
  'Fabric quality': 'कापडाची गुणवत्ता', 'Carefully sourced, colour-fast fabrics that keep their shape wash after wash.': 'काळजीपूर्वक निवडलेले, रंग न जाणारे कापड जे प्रत्येक धुण्यानंतरही आकार टिकवते.',
  'Custom sizing': 'हवे तसे साइज', 'Size charts from pre-primary to adult, with made-to-measure options.': 'पूर्व-प्राथमिक ते प्रौढांपर्यंत साइज चार्ट, मापानुसार शिलाईसह.',
  'Bulk orders': 'मोठ्या ऑर्डर', 'Consistent quality across hundreds of pieces for schools and institutions.': 'शाळा व संस्थांसाठी शेकडो नगांमध्ये एकसारखी गुणवत्ता.',
  'On-time delivery': 'वेळेवर डिलिव्हरी', 'Planned production so your uniforms are ready before the term begins.': 'नियोजित उत्पादन, त्यामुळे सत्र सुरू होण्यापूर्वी युनिफॉर्म तयार.',
  // quote section
  'Let’s make your next uniform order': 'चला, तुमची पुढची युनिफॉर्म ऑर्डर तयार करूया',
  'Tell us which style you’re interested in and how to reach you. We’ll reply with pricing, fabric options and delivery timelines.': 'तुम्हाला कोणती स्टाइल हवी आहे आणि तुमच्याशी कसा संपर्क साधायचा ते सांगा. आम्ही किंमत, कापडाचे पर्याय आणि डिलिव्हरीची वेळ कळवू.',
  'Share your details': 'तुमची माहिती द्या', 'Takes less than a minute.': 'एका मिनिटापेक्षा कमी वेळ लागतो.',
  'We get in touch': 'आम्ही संपर्क करतो', 'By phone or email to understand your needs.': 'तुमची गरज समजून घेण्यासाठी फोन किंवा ईमेलने.',
  'Samples & pricing': 'नमुने व किंमत', 'Fabric swatches, sizes and a clear quote.': 'कापडाचे नमुने, साइज आणि स्पष्ट कोटेशन.',
  'Your details': 'तुमची माहिती', 'Fields marked * are required.': '* असलेली माहिती आवश्यक आहे.',
  // quote form
  'First name': 'नाव', 'Surname': 'आडनाव', 'Mobile number': 'मोबाईल नंबर', 'Email address': 'ईमेल पत्ता', 'Product': 'उत्पादन',
  'Choose a product…': 'उत्पादन निवडा…', 'Message (optional)': 'संदेश (ऐच्छिक)', 'Quantity, sizes or anything else we should know': 'प्रमाण, साइज किंवा इतर काही माहिती',
  'Sending…': 'पाठवत आहे…', 'No obligation. We only use your details to reply to this request.': 'कोणतेही बंधन नाही. तुमची माहिती फक्त या विनंतीला उत्तर देण्यासाठी वापरली जाते.',
  'Please check the highlighted fields.': 'कृपया हायलाइट केलेली माहिती तपासा.', 'Please correct the highlighted fields.': 'कृपया हायलाइट केलेली माहिती दुरुस्त करा.',
  'Something went wrong. Please try again.': 'काहीतरी चुकले. कृपया पुन्हा प्रयत्न करा.',
  'Could not save your request. Please try again.': 'तुमची विनंती जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.',
  'Too many requests. Please try again in a few minutes.': 'खूप विनंत्या. कृपया काही मिनिटांनी पुन्हा प्रयत्न करा.',
  'Thank you, {name}!': 'धन्यवाद, {name}!',
  'Thank you! Your quote request has been received. Our team will contact you shortly.': 'धन्यवाद! तुमची कोटेशन विनंती मिळाली आहे. आमची टीम लवकरच तुमच्याशी संपर्क साधेल.',
  'Thank you! Your quote request has been received.': 'धन्यवाद! तुमची कोटेशन विनंती मिळाली आहे.',
  'Your enquiry:': 'तुमची चौकशी:', 'We’ll reach you at {email} or {mobile}.': 'आम्ही {email} किंवा {mobile} वर संपर्क करू.',
  'Send another request': 'आणखी एक विनंती पाठवा',
  'Please enter your first name': 'कृपया तुमचे नाव लिहा', 'Please enter your surname': 'कृपया तुमचे आडनाव लिहा',
  'Please enter your mobile number': 'कृपया तुमचा मोबाईल नंबर लिहा', 'Please enter your email address': 'कृपया तुमचा ईमेल पत्ता लिहा',
  'Please choose a product': 'कृपया उत्पादन निवडा', 'Please enter a valid first name': 'कृपया योग्य नाव लिहा',
  'Please enter a valid surname': 'कृपया योग्य आडनाव लिहा', 'Please enter a valid email address': 'कृपया योग्य ईमेल पत्ता लिहा',
  'Please enter a valid mobile number': 'कृपया योग्य मोबाईल नंबर लिहा',
  'Enter a valid mobile number (7–15 digits, e.g. +91 98765 43210)': 'योग्य मोबाईल नंबर लिहा (७–१५ अंक, उदा. +91 98765 43210)',
  'Please choose a product from the list': 'कृपया यादीतून उत्पादन निवडा', 'This field is required': 'ही माहिती आवश्यक आहे',
  'Must be at most {n} characters': 'जास्तीत जास्त {n} अक्षरे', 'Website': 'वेबसाइट',
  // product page
  'Loading…': 'लोड होत आहे…', 'Product not found': 'उत्पादन सापडले नाही', 'This style may no longer be available.': 'ही स्टाइल आता उपलब्ध नसेल.',
  'Browse the collection': 'संग्रह पहा', 'Breadcrumb': 'मार्ग', 'Back': 'मागे', 'Home': 'मुख्यपृष्ठ',
  '{name} — alternate view': '{name} — दुसरे दृश्य', 'Choose image': 'चित्र निवडा', 'Show image {n}': 'चित्र {n} दाखवा',
  'About this style': 'या स्टाइलबद्दल', 'Category': 'श्रेणी', 'Product code': 'उत्पादन कोड', 'Customisation': 'कस्टमायझेशन',
  'Colours, crest & embroidery on request': 'रंग, लोगो व भरतकाम विनंतीनुसार', 'Available sizes': 'उपलब्ध साइज',
  'Request a quote for {name}': '{name} साठी कोटेशन मागवा', 'We’ll reply with pricing, fabric options and availability.': 'आम्ही किंमत, कापडाचे पर्याय आणि उपलब्धता कळवू.',
  'You may also like': 'तुम्हाला हेही आवडेल',
  'Chest size (in)': 'छाती (इंच)', 'Waist (in)': 'कंबर (इंच)', 'Waist (in) — lengths on request': 'कंबर (इंच) — लांबी विनंतीनुसार', 'Age': 'वय',
  // footer
  'School uniforms, kids wear and occasion garments — made to order in our own production unit.': 'शाळा युनिफॉर्म, लहान मुलांचे कपडे आणि समारंभाचे कपडे — आमच्या स्वतःच्या युनिटमध्ये ऑर्डरनुसार बनवलेले.',
  'Company': 'कंपनी', 'About us': 'आमच्याबद्दल', 'Contact': 'संपर्क', 'Placeholder': 'नमुना',
  'Phone:': 'फोन:', 'Email:': 'ईमेल:', 'Address:': 'पत्ता:', '(placeholder)': '(नमुना)', 'Your business address here': 'तुमचा व्यवसायाचा पत्ता येथे',
  'School Uniforms & Garments': 'शाळा युनिफॉर्म्स व गारमेंट्स',
  // product catalogue (names, taglines, descriptions)
  'Shirt': 'शर्ट', 'Pant': 'पँट', 'Skirt': 'स्कर्ट', 'Pinaco': 'पिनॅको', 'Grammer': 'ग्रामर', 'Half Hastin': 'हाफ हस्तीन', 'Bandi': 'बंडी',
  'Crisp, durable uniform shirts for every season': 'प्रत्येक ऋतूसाठी कडक, टिकाऊ युनिफॉर्म शर्ट',
  'Half and full sleeve uniform shirts in poly-cotton and oxford fabrics, stitched for daily wear and frequent washing.': 'पॉली-कॉटन आणि ऑक्सफर्ड कापडातील हाफ व फुल स्लीव्ह युनिफॉर्म शर्ट — रोजच्या वापरासाठी आणि वारंवार धुण्यासाठी शिवलेले.',
  'Available in school and corporate colours. Custom pocket embroidery, logo badges and button colours on request. Suitable for bulk school and institutional orders.': 'शाळा व कॉर्पोरेट रंगांमध्ये उपलब्ध. खिशावर भरतकाम, लोगो बॅज आणि बटणांचे रंग विनंतीनुसार. शाळा व संस्थांच्या मोठ्या ऑर्डरसाठी योग्य.',
  'Tailored uniform trousers built to last': 'दीर्घकाळ टिकणारी, नीट शिवलेली युनिफॉर्म पँट',
  'Uniform trousers with reinforced seams, adjustable waist options and a clean, formal finish.': 'मजबूत शिवण, कंबर ॲडजस्ट करण्याचे पर्याय आणि स्वच्छ, औपचारिक फिनिश असलेली युनिफॉर्म पँट.',
  'Terry-wool, poly-viscose and cotton blends. Elastic or belt-loop waist, single or double pleat. Bulk sizing charts available for schools.': 'टेरी-वूल, पॉली-व्हिस्कोस आणि कॉटन मिश्रण. इलास्टिक किंवा बेल्ट-लूप कंबर, सिंगल किंवा डबल प्लीट. शाळांसाठी मोठ्या प्रमाणातील साइज चार्ट उपलब्ध.',
  'Pleated and A-line skirts in school colours': 'शाळेच्या रंगांतील प्लीटेड व A-लाइन स्कर्ट',
  'Box-pleated and A-line uniform skirts with neat pleats that hold their shape wash after wash.': 'बॉक्स-प्लीटेड व A-लाइन युनिफॉर्म स्कर्ट — प्रत्येक धुण्यानंतरही प्लीट्स जशाच्या तशा.',
  'Checks and solids in poly-cotton and terry-wool. Side zip or elastic waist. Matching pinafores and ties can be supplied together.': 'पॉली-कॉटन व टेरी-वूलमध्ये चौकडी आणि प्लेन. साइड झिप किंवा इलास्टिक कंबर. जुळणारे पिनॅफोर आणि टाय सोबत मिळू शकतात.',
  'Comfortable pinafores for the youngest learners': 'लहानग्यांसाठी आरामदायी पिनॅफोर',
  'Pinafore (pinaco) dresses for pre-primary and primary students, designed for comfort and easy dressing.': 'पूर्व-प्राथमिक व प्राथमिक विद्यार्थ्यांसाठी पिनॅफोर (पिनॅको) ड्रेस — आरामदायी आणि सहज घालता येणारे.',
  'Soft, breathable fabric with adjustable straps or buttoned shoulders. Pair with our uniform shirts for a complete set.': 'मऊ, हवेशीर कापड; ॲडजस्टेबल पट्टे किंवा खांद्यावर बटणे. संपूर्ण सेटसाठी आमच्या युनिफॉर्म शर्टसोबत वापरा.',
  'Sturdy dungaree-style grammers': 'मजबूत डंगरी-स्टाइल ग्रामर',
  'Grammer / dungaree-style uniform wear for young children, made for active school days.': 'लहान मुलांसाठी ग्रामर / डंगरी-स्टाइल युनिफॉर्म — धावपळीच्या शाळेच्या दिवसांसाठी.',
  'Durable twill and poly-cotton fabrics with secure buttons and generous seam allowances for growing kids.': 'टिकाऊ ट्विल व पॉली-कॉटन कापड, पक्की बटणे आणि वाढत्या मुलांसाठी पुरेशी शिवण-जागा.',
  'Half-sleeve essentials': 'रोजचे हाफ-स्लीव्ह कपडे',
  'Half-sleeve (half hastin) uniform tops for warmer months and sports days.': 'उन्हाळ्यासाठी आणि क्रीडा दिवसांसाठी हाफ-स्लीव्ह (हाफ हस्तीन) युनिफॉर्म टॉप्स.',
  'Lightweight cotton-rich fabrics, colour-fast dyes and optional school crest printing or embroidery.': 'हलके कॉटन-युक्त कापड, पक्के रंग आणि ऐच्छिक शाळेचा लोगो प्रिंट किंवा भरतकाम.',
  'Smart bandi jackets for events and uniforms': 'कार्यक्रम व युनिफॉर्मसाठी आकर्षक बंडी जॅकेट',
  'Sleeveless bandi (Nehru-style) jackets for school functions, staff uniforms and festive occasions.': 'शाळेचे कार्यक्रम, कर्मचारी युनिफॉर्म आणि सणांसाठी बिनबाह्यांची बंडी (नेहरू-स्टाइल) जॅकेट.',
  'Available in solid, textured and jacquard fabrics with contrast piping and custom buttons. Great for annual days and team uniforms.': 'प्लेन, टेक्स्चर्ड व जॅकार्ड कापडात, कॉन्ट्रास्ट पायपिंग आणि हवी ती बटणे. वार्षिक स्नेहसंमेलन आणि टीम युनिफॉर्मसाठी उत्तम.',
};

export const PRODUCT_NAME_MR = { shirt: 'शर्ट', pant: 'पँट', skirt: 'स्कर्ट', pinaco: 'पिनॅको', grammer: 'ग्रामर', halfhastin: 'हाफ हस्तीन', bandi: 'बंडी' };

function interpolate(s, vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function makeT(lang) {
  return (s, vars) => {
    if (s == null) return s;
    let out = s;
    if (lang === 'mr') {
      if (Object.prototype.hasOwnProperty.call(MR, s)) out = MR[s];
      else {
        const m = /^Must be at most (\d+) characters$/.exec(s);
        if (m) out = interpolate(MR['Must be at most {n} characters'], { n: m[1] });
      }
    }
    return interpolate(out, vars);
  };
}

export const LangContext = createContext({ lang: 'en', t: makeT('en') });
export const useLang = () => useContext(LangContext);

export function readPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; }
}
export function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
