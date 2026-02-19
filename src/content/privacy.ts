export type PolicyBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullets'; items: string[] };

const en: PolicyBlock[] = [
  {
    type: 'p',
    text: 'In order to receive information about your Personal Data, the purposes and the parties the Data is shared with, contact the Owner.',
  },
  { type: 'h2', text: 'Owner and Data Controller' },
  {
    type: 'p',
    text: 'Rotolando Verso Sud S.r.l.\nOwner contact email: enzo@rotolandoversosud.it',
  },
  { type: 'h2', text: 'Types of Data collected' },
  {
    type: 'p',
    text: "The owner does not provide a list of Personal Data types collected.\n\nComplete details on each type of Personal Data collected are provided in the dedicated sections of this privacy policy or by specific explanation texts displayed prior to the Data collection.\n\nPersonal Data may be freely provided by the User, or, in case of Usage Data, collected automatically when using this Application.\n\nUnless specified otherwise, all Data requested by this Application is mandatory and failure to provide this Data may make it impossible for this Application to provide its services. In cases where this Application specifically states that some Data is not mandatory, Users are free not to communicate this Data without consequences to the availability or the functioning of the Service.\n\nUsers who are uncertain about which Personal Data is mandatory are welcome to contact the Owner.\n\nAny use of Cookies – or of other tracking tools — by this Application or by the owners of third-party services used by this Application serves the purpose of providing the Service required by the User, in addition to any other purposes described in the present document.\n\nUsers are responsible for any third-party Personal Data obtained, published or shared through this Application.",
  },
  { type: 'h2', text: 'Mode and place of processing the Data' },
  { type: 'h3', text: 'Methods of processing' },
  {
    type: 'p',
    text: 'The Owner takes appropriate security measures to prevent unauthorised access, disclosure, modification, or unauthorised destruction of the Data.\n\nThe Data processing is carried out using computers and/or IT enabled tools, following organisational procedures and modes strictly related to the purposes indicated. In addition to the Owner, in some cases, the Data may be accessible to certain types of persons in charge, involved with the operation of this Application (administration, sales, marketing, legal, system administration) or external parties (such as third-party technical service providers, mail carriers, hosting providers, IT companies, communications agencies) appointed, if necessary, as Data Processors by the Owner. The updated list of these parties may be requested from the Owner at any time.',
  },
  { type: 'h3', text: 'Place' },
  {
    type: 'p',
    text: "The Data is processed at the Owner's operating offices and in any other places where the parties involved in the processing are located.\n\nDepending on the User's location, data transfers may involve transferring the User's Data to a country other than their own. To find out more about the place of processing of such transferred Data, Users can check the section containing details about the processing of Personal Data.",
  },
  { type: 'h3', text: 'Retention time' },
  {
    type: 'p',
    text: 'Personal Data shall be processed and stored for as long as required by the purpose they have been collected for.',
  },
  { type: 'h2', text: 'Further Information for Users' },
  { type: 'h3', text: 'Legal basis of processing' },
  {
    type: 'p',
    text: 'The Owner may process Personal Data relating to Users if one of the following applies:',
  },
  {
    type: 'bullets',
    items: [
      'Users have given their consent for one or more specific purposes.',
      'provision of Data is necessary for the performance of an agreement with the User and/or for any pre-contractual obligations thereof;',
      'processing is necessary for compliance with a legal obligation to which the Owner is subject;',
      'processing is related to a task that is carried out in the public interest or in the exercise of official authority vested in the Owner;',
      'processing is necessary for the purposes of the legitimate interests pursued by the Owner or by a third party.',
    ],
  },
  {
    type: 'p',
    text: 'In any case, the Owner will gladly help to clarify the specific legal basis that applies to the processing, and in particular whether the provision of Personal Data is a statutory or contractual requirement, or a requirement necessary to enter into a contract.',
  },
  { type: 'h3', text: 'Further information about retention time' },
  {
    type: 'p',
    text: 'Personal Data shall be processed and stored for as long as required by the purpose they have been collected for.\n\nTherefore:',
  },
  {
    type: 'bullets',
    items: [
      'Personal Data collected for purposes related to the performance of a contract between the Owner and the User shall be retained until such contract has been fully performed.',
      "Personal Data collected for the purposes of the Owner's legitimate interests shall be retained as long as needed to fulfill such purposes. Users may find specific information regarding the legitimate interests pursued by the Owner within the relevant sections of this document or by contacting the Owner.",
    ],
  },
  {
    type: 'p',
    text: "The Owner may be allowed to retain Personal Data for a longer period whenever the User has given consent to such processing, as long as such consent is not withdrawn. Furthermore, the Owner may be obliged to retain Personal Data for a longer period whenever required to fulfil a legal obligation or upon order of an authority.\n\nOnce the retention period expires, Personal Data shall be deleted. Therefore, the right of access, the right to erasure, the right to rectification and the right to data portability cannot be enforced after expiration of the retention period.",
  },
  {
    type: 'h2',
    text: 'The rights of Users based on the General Data Protection Regulation (GDPR)',
  },
  {
    type: 'p',
    text: 'Users may exercise certain rights regarding their Data processed by the Owner.\n\nIn particular, Users have the right to do the following, to the extent permitted by law:',
  },
  {
    type: 'bullets',
    items: [
      'Withdraw their consent at any time. Users have the right to withdraw consent where they have previously given their consent to the processing of their Personal Data.',
      'Object to processing of their Data. Users have the right to object to the processing of their Data if the processing is carried out on a legal basis other than consent.',
      'Access their Data. Users have the right to learn if Data is being processed by the Owner, obtain disclosure regarding certain aspects of the processing and obtain a copy of the Data undergoing processing.',
      'Verify and seek rectification. Users have the right to verify the accuracy of their Data and ask for it to be updated or corrected.',
      'Restrict the processing of their Data. Users have the right to restrict the processing of their Data. In this case, the Owner will not process their Data for any purpose other than storing it.',
      'Have their Personal Data deleted or otherwise removed. Users have the right to obtain the erasure of their Data from the Owner.',
      'Receive their Data and have it transferred to another controller. Users have the right to receive their Data in a structured, commonly used and machine readable format and, if technically feasible, to have it transmitted to another controller without any hindrance.',
      'Lodge a complaint. Users have the right to bring a claim before their competent data protection authority.',
    ],
  },
  {
    type: 'p',
    text: "Users are also entitled to learn about the legal basis of Data transfers to a country outside the European Union or to any international organisation governed by public international law or set up by two or more countries, such as the UN, and about the security measures taken by the Owner to safeguard their Data.\n\nIf any such transfer takes place, Users can find out more by checking the relevant sections of this document or enquire with the Owner using the information provided in the contact section.",
  },
  { type: 'h3', text: 'Details about the right to object to processing' },
  {
    type: 'p',
    text: "Where Personal Data is processed for a public interest, in the exercise of an official authority vested in the Owner or for the purposes of the legitimate interests pursued by the Owner, Users may object to such processing by providing a ground related to their particular situation to justify the objection.\n\nUsers must know that, however, should their Personal Data be processed for direct marketing purposes, they can object to that processing at any time, free of charge and without providing any justification. Where the User objects to processing for direct marketing purposes, the Personal Data will no longer be processed for such purposes. To learn whether the Owner is processing Personal Data for direct marketing purposes, Users may refer to the relevant sections of this document.",
  },
  { type: 'h3', text: 'How to exercise these rights' },
  {
    type: 'p',
    text: "Any requests to exercise User rights can be directed to the Owner through the contact details provided in this document. Such requests are free of charge and will be answered by the Owner as early as possible and always within one month, providing Users with the information required by law. Any rectification or erasure of Personal Data or restriction of processing will be communicated by the Owner to each recipient, if any, to whom the Personal Data has been disclosed unless this proves impossible or involves disproportionate effort. At the Users' request, the Owner will inform them about those recipients.",
  },
  { type: 'h2', text: 'Further information for Users in the United States' },
  {
    type: 'p',
    text: 'This part of the document integrates with and supplements the information contained in the rest of the privacy policy and is provided by the business running this Application and, if the case may be, its parent, subsidiaries and affiliates (for the purposes of this section referred to collectively as "we", "us", "our").\n\nThe information contained in this section applies to all Users (Users are referred to below, simply as "you", "your", "yours"), who are residents in the following states: California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana.\n\nFor such Users, this information supersedes any other possibly divergent or conflicting provisions contained in the privacy policy.\n\nThis part of the document uses the term Personal Information.',
  },
  { type: 'h3', text: 'Notice at collection' },
  {
    type: 'p',
    text: 'The following Notice at collection provides you with timely notice about the categories of Personal Information collected or disclosed in the past 12 months so that you can exercise meaningful control over our use of that Information.\n\nWhile such categorization of Personal Information is mainly based on California privacy laws, it can also be helpful for anyone who is not a California resident to get a general idea of what types of Personal Information are collected.\n\nℹ️ You can read the definitions of these concepts inside the "Definitions and legal references section" of the privacy policy.\n\nTo know more about your rights you can refer to the "Your privacy rights under US state laws" section of our privacy policy.\n\nFor more details on the collection of Personal Information, please read the section "Detailed information on the processing of Personal Data" of our privacy policy.\n\nWe won\'t process your Information for unexpected purposes, or for purposes that are not reasonably necessary to and compatible with the purposes originally disclosed, without your consent.',
  },
  { type: 'h3', text: 'What are the sources of the Personal Information we collect?' },
  {
    type: 'p',
    text: 'We collect the above-mentioned categories of Personal Information, either directly or indirectly, from you when you use this Application.\n\nFor example, you directly provide your Personal Information when you submit requests via any forms on this Application. You also provide Personal Information indirectly when you navigate this Application, as Personal Information about you is automatically observed and collected.',
  },
  { type: 'h3', text: 'Your privacy rights under US state laws' },
  {
    type: 'p',
    text: 'You may exercise certain rights regarding your Personal Information. In particular, to the extent permitted by applicable law, you have:',
  },
  {
    type: 'bullets',
    items: [
      'the right to access Personal Information: the right to know. You have the right to request that we confirm whether or not we are processing your Personal Information. You also have the right to access such Personal Information;',
      'the right to correct inaccurate Personal Information. You have the right to request that we correct any inaccurate Personal Information we maintain about you;',
      'the right to request the deletion of your Personal Information. You have the right to request that we delete any of your Personal Information;',
      'the right to obtain a copy of your Personal Information. We will provide your Personal Information in a portable and usable format that allows you to transfer data easily to another entity – provided that this is technically feasible;',
      'the right to opt out from the Sale of your Personal Information; We will not discriminate against you for exercising your privacy rights.',
      'the right to non-discrimination.',
    ],
  },
  { type: 'h3', text: 'Additional rights for Users residing in California' },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in California, you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the Sharing of your Personal Information for cross-context behavioral advertising;',
      'The right to request to limit our use or disclosure of your Sensitive Personal Information to only that which is necessary to perform the services or provide the goods, as is reasonably expected by an average consumer. Please note that certain exceptions outlined in the law may apply, such as, when the collection and processing of Sensitive Personal Information is necessary to verify or maintain the quality or safety of our service.',
    ],
  },
  {
    type: 'h3',
    text: 'Additional rights for Users residing in Virginia, Colorado, Connecticut, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana',
  },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in Virginia, Colorado, Connecticut, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the processing of your personal information for Targeted Advertising or profiling in furtherance of decisions that produce legal or similarly significant effects concerning you;',
      'The right to freely give, deny or withdraw your consent for the processing of your Sensitive Personal Information. Please note that certain exceptions outlined in the law may apply, such as, but not limited to, when the collection and processing of Sensitive Personal Information is necessary for the provision of a product or service specifically requested by the consumer.',
    ],
  },
  { type: 'h3', text: 'Additional rights for users residing in Utah and Iowa' },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in Utah and Iowa, you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the processing of your Personal Information for Targeted Advertising;',
      'The right to opt out of the processing of your Sensitive Personal Information. Please note that certain exceptions outlined in the law may apply, such as, but not limited to, when the collection and processing of Sensitive Personal Information is necessary for the provision of a product or service specifically requested by the consumer.',
    ],
  },
  { type: 'h3', text: 'How to exercise your privacy rights under US state laws' },
  {
    type: 'p',
    text: "To exercise the rights described above, you need to submit your request to us by contacting us via the contact details provided in this document.\n\nFor us to respond to your request, we must know who you are. We will not respond to any request if we are unable to verify your identity and therefore confirm the Personal Information in our possession relates to you. You are not required to create an account with us to submit your request. We will use any Personal Information collected from you in connection with the verification of your request solely for verification and shall not further disclose the Personal Information, retain it longer than necessary for purposes of verification, or use it for unrelated purposes.\n\nIf you are an adult, you can make a request on behalf of a child under your parental authority.",
  },
  { type: 'h3', text: 'How to exercise your rights to opt out' },
  {
    type: 'p',
    text: 'In addition to what is stated above, to exercise your right to opt-out of Sale or Sharing and Targeted Advertising you can also use the privacy choices link provided on this Application.\n\nIf you want to submit requests to opt out of Sale or Sharing and Targeted Advertising activities via a user-enabled global privacy control, such as for example the Global Privacy Control ("GPC"), you are free to do so and we will abide by such request in a frictionless manner.',
  },
  { type: 'h3', text: 'How and when we are expected to handle your request' },
  {
    type: 'p',
    text: 'We will respond to your request without undue delay, but in all cases within the timeframe required by applicable law. Should we need more time, we will explain to you the reasons why, and how much more time we need.\n\nShould we deny your request, we will explain to you the reasons behind our denial (where envisaged by applicable law you may then contact the relevant authority to submit a complaint).\n\nWe do not charge a fee to process or respond to your request unless such request is manifestly unfounded or excessive and in all other cases where it is permitted by the applicable law. In such cases, we may charge a reasonable fee or refuse to act on the request. In either case, we will communicate our choices and explain the reasons behind them.',
  },
  { type: 'h2', text: 'Additional information about Data collection and processing' },
  { type: 'h3', text: 'Legal action' },
  {
    type: 'p',
    text: "The User's Personal Data may be used for legal purposes by the Owner in Court or in the stages leading to possible legal action arising from improper use of this Application or the related Services.\n\nThe User declares to be aware that the Owner may be required to reveal personal data upon request of public authorities.",
  },
  { type: 'h3', text: "Additional information about User's Personal Data" },
  {
    type: 'p',
    text: 'In addition to the information contained in this privacy policy, this Application may provide the User with additional and contextual information concerning particular Services or the collection and processing of Personal Data upon request.',
  },
  { type: 'h3', text: 'System logs and maintenance' },
  {
    type: 'p',
    text: 'For operation and maintenance purposes, this Application and any third-party services may collect files that record interaction with this Application (System logs) or use other Personal Data (such as the IP Address) for this purpose.',
  },
  { type: 'h3', text: 'Information not contained in this policy' },
  {
    type: 'p',
    text: 'More details concerning the collection or processing of Personal Data may be requested from the Owner at any time. Please see the contact information at the beginning of this document.',
  },
  { type: 'h3', text: 'Changes to this privacy policy' },
  {
    type: 'p',
    text: 'The Owner reserves the right to make changes to this privacy policy at any time by notifying its Users on this page and possibly within this Application and/or - as far as technically and legally feasible - sending a notice to Users via any contact information available to the Owner. It is strongly recommended to check this page often, referring to the date of the last modification listed at the bottom.',
  },
];

const it: PolicyBlock[] = [
  {
    type: 'p',
    text: 'Per avere informazioni circa i tuoi dati personali raccolti, le finalità ed i soggetti con cui i dati vengono condivisi, contatta il Titolare.',
  },
  { type: 'h2', text: 'Titolare del Trattamento dei Dati' },
  {
    type: 'p',
    text: 'Rotolando Verso Sud S.r.l.\nIndirizzo email del Titolare: enzo@rotolandoversosud.it',
  },
  { type: 'h2', text: 'Tipologie di Dati raccolti' },
  {
    type: 'p',
    text: "Il Titolare non fornisce una lista di tipologie di Dati Personali raccolti.\n\nDettagli completi su ciascuna tipologia di Dati Personali raccolti sono forniti nelle sezioni dedicate di questa privacy policy o mediante specifici testi informativi visualizzati prima della raccolta dei Dati stessi.\n\nI Dati Personali possono essere liberamente forniti dall'Utente o, nel caso di Dati di Utilizzo, raccolti automaticamente durante l'uso di questa Applicazione.\n\nSe non diversamente specificato, tutti i Dati richiesti da questa Applicazione sono obbligatori. Se l'Utente rifiuta di comunicarli, potrebbe essere impossibile per questa Applicazione fornire il Servizio. Nei casi in cui questa Applicazione indichi alcuni Dati come facoltativi, gli Utenti sono liberi di astenersi dal comunicare tali Dati, senza che ciò abbia alcuna conseguenza sulla disponibilità del Servizio o sulla sua operatività.\n\nGli Utenti che dovessero avere dubbi su quali Dati siano obbligatori sono incoraggiati a contattare il Titolare.\n\nL'eventuale utilizzo di Cookie - o di altri strumenti di tracciamento - da parte di questa Applicazione o dei titolari dei servizi terzi utilizzati da questa Applicazione ha la finalità di fornire il Servizio richiesto dall'Utente, oltre alle ulteriori finalità descritte nel presente documento.\n\nL'Utente si assume la responsabilità dei Dati Personali di terzi ottenuti, pubblicati o condivisi mediante questa Applicazione.",
  },
  { type: 'h2', text: 'Modalità e luogo del trattamento dei Dati raccolti' },
  { type: 'h3', text: 'Modalità di trattamento' },
  {
    type: 'p',
    text: "Il Titolare adotta le opportune misure di sicurezza volte ad impedire l'accesso, la divulgazione, la modifica o la distruzione non autorizzate dei Dati Personali.\n\nIl trattamento viene effettuato mediante strumenti informatici e/o telematici, con modalità organizzative e con logiche strettamente correlate alle finalità indicate. Oltre al Titolare, in alcuni casi, potrebbero avere accesso ai Dati altri soggetti coinvolti nell'organizzazione di questa Applicazione (personale amministrativo, commerciale, marketing, legali, amministratori di sistema) ovvero soggetti esterni (come fornitori di servizi tecnici terzi, corrieri postali, hosting provider, società informatiche, agenzie di comunicazione) nominati anche, se necessario, Responsabili del Trattamento da parte del Titolare. L'elenco aggiornato dei Responsabili potrà sempre essere richiesto al Titolare del Trattamento.",
  },
  { type: 'h3', text: 'Luogo' },
  {
    type: 'p',
    text: "I Dati sono trattati presso le sedi operative del Titolare ed in ogni altro luogo in cui le parti coinvolte nel trattamento siano localizzate. Per ulteriori informazioni, contatta il Titolare.\n\nI Dati Personali dell'Utente potrebbero essere trasferiti in un paese diverso da quello in cui l'Utente si trova. Per ottenere ulteriori informazioni sul luogo del trattamento l'Utente può fare riferimento alla sezione relativa ai dettagli sul trattamento dei Dati Personali.",
  },
  { type: 'h3', text: 'Periodo di conservazione' },
  {
    type: 'p',
    text: 'Se non diversamente indicato in questo documento, i Dati Personali sono trattati e conservati per il tempo richiesto dalla finalità per la quale sono stati raccolti e potrebbero essere conservati per un periodo più lungo a causa di eventuali obbligazioni legali o sulla base del consenso degli Utenti.',
  },
  { type: 'h2', text: 'Ulteriori informazioni per gli utenti' },
  { type: 'h3', text: 'Base giuridica del trattamento' },
  {
    type: 'p',
    text: "Il Titolare tratta Dati Personali relativi all'Utente in caso sussista una delle seguenti condizioni:",
  },
  {
    type: 'bullets',
    items: [
      "l'Utente ha prestato il consenso per una o più finalità specifiche.",
      "il trattamento è necessario all'esecuzione di un contratto con l'Utente e/o all'esecuzione di misure precontrattuali;",
      'il trattamento è necessario per adempiere un obbligo legale al quale è soggetto il Titolare;',
      "il trattamento è necessario per l'esecuzione di un compito di interesse pubblico o per l'esercizio di pubblici poteri di cui è investito il Titolare;",
      'il trattamento è necessario per il perseguimento del legittimo interesse del Titolare o di terzi.',
    ],
  },
  {
    type: 'p',
    text: 'È comunque sempre possibile richiedere al Titolare di chiarire la concreta base giuridica di ciascun trattamento ed in particolare di specificare se il trattamento sia basato sulla legge, previsto da un contratto o necessario per concludere un contratto.',
  },
  { type: 'h3', text: 'Ulteriori informazioni sul tempo di conservazione' },
  {
    type: 'p',
    text: 'Se non diversamente indicato in questo documento, i Dati Personali sono trattati e conservati per il tempo richiesto dalla finalità per la quale sono stati raccolti e potrebbero essere conservati per un periodo più lungo a causa di eventuali obbligazioni legali o sulla base del consenso degli Utenti.\n\nPertanto:',
  },
  {
    type: 'bullets',
    items: [
      "I Dati Personali raccolti per scopi collegati all'esecuzione di un contratto tra il Titolare e l'Utente saranno trattenuti sino a quando sia completata l'esecuzione di tale contratto.",
      "I Dati Personali raccolti per finalità riconducibili all'interesse legittimo del Titolare saranno trattenuti sino al soddisfacimento di tale interesse. L'Utente può ottenere ulteriori informazioni in merito all'interesse legittimo perseguito dal Titolare nelle relative sezioni di questo documento o contattando il Titolare.",
    ],
  },
  {
    type: 'p',
    text: "Quando il trattamento è basato sul consenso dell'Utente, il Titolare può conservare i Dati Personali più a lungo sino a quando detto consenso non venga revocato. Inoltre, il Titolare potrebbe essere obbligato a conservare i Dati Personali per un periodo più lungo per adempiere ad un obbligo di legge o per ordine di un'autorità.\n\nAl termine del periodo di conservazione i Dati Personali saranno cancellati. Pertanto, allo spirare di tale termine il diritto di accesso, cancellazione, rettificazione ed il diritto alla portabilità dei Dati non potranno più essere esercitati.",
  },
  {
    type: 'h2',
    text: "Diritti dell'Utente sulla base del Regolamento Generale sulla Protezione dei Dati (GDPR)",
  },
  {
    type: 'p',
    text: "Gli Utenti possono esercitare determinati diritti con riferimento ai Dati trattati dal Titolare.\n\nIn particolare, nei limiti previsti dalla legge, l'Utente ha il diritto di:",
  },
  {
    type: 'bullets',
    items: [
      "revocare il consenso in ogni momento. L'Utente può revocare il consenso al trattamento dei propri Dati Personali precedentemente espresso.",
      "opporsi al trattamento dei propri Dati. L'Utente può opporsi al trattamento dei propri Dati quando esso avviene in virtù di una base giuridica diversa dal consenso.",
      "accedere ai propri Dati. L'Utente ha diritto ad ottenere informazioni sui Dati trattati dal Titolare, su determinati aspetti del trattamento ed a ricevere una copia dei Dati trattati.",
      "verificare e chiedere la rettificazione. L'Utente può verificare la correttezza dei propri Dati e richiederne l'aggiornamento o la correzione.",
      "ottenere la limitazione del trattamento. L'Utente può richiedere la limitazione del trattamento dei propri Dati. In tal caso il Titolare non tratterà i Dati per alcun altro scopo se non la loro conservazione.",
      "ottenere la cancellazione o rimozione dei propri Dati Personali. L'Utente può richiedere la cancellazione dei propri Dati da parte del Titolare.",
      "ricevere i propri Dati o farli trasferire ad altro titolare. L'Utente ha diritto di ricevere i propri Dati in formato strutturato, di uso comune e leggibile da dispositivo automatico e, ove tecnicamente fattibile, di ottenerne il trasferimento senza ostacoli ad un altro titolare.",
      "proporre reclamo. L'Utente può proporre un reclamo all'autorità di controllo della protezione dei dati personali competente o agire in sede giudiziale.",
    ],
  },
  {
    type: 'p',
    text: "Gli Utenti hanno diritto di ottenere informazioni in merito alla base giuridica per il trasferimento di Dati all'estero incluso verso qualsiasi organizzazione internazionale regolata dal diritto internazionale o costituita da due o più paesi, come ad esempio l'ONU, nonché in merito alle misure di sicurezza adottate dal Titolare per proteggere i loro Dati.",
  },
  { type: 'h3', text: 'Dettagli sul diritto di opposizione' },
  {
    type: 'p',
    text: "Quando i Dati Personali sono trattati nell'interesse pubblico, nell'esercizio di pubblici poteri di cui è investito il Titolare oppure per perseguire un interesse legittimo del Titolare, gli Utenti hanno diritto ad opporsi al trattamento per motivi connessi alla loro situazione particolare.\n\nSi fa presente agli Utenti che, ove i loro Dati fossero trattati con finalità di marketing diretto, possono opporsi al trattamento in qualsiasi momento, gratuitamente e senza fornire alcuna motivazione. Qualora gli Utenti si oppongano al trattamento per finalità di marketing diretto, i Dati Personali non sono più oggetto di trattamento per tali finalità. Per scoprire se il Titolare tratti Dati con finalità di marketing diretto gli Utenti possono fare riferimento alle rispettive sezioni di questo documento.",
  },
  { type: 'h3', text: 'Come esercitare i diritti' },
  {
    type: 'p',
    text: "Eventuali richieste di esercizio dei diritti dell'Utente possono essere indirizzate al Titolare attraverso i recapiti forniti in questo documento. La richiesta è gratuita e il Titolare risponderà nel più breve tempo possibile, in ogni caso entro un mese, fornendo all'Utente tutte le informazioni previste dalla legge. Eventuali rettifiche, cancellazioni o limitazioni del trattamento saranno comunicate dal Titolare a ciascuno dei destinatari, se esistenti, a cui sono stati trasmessi i Dati Personali, salvo che ciò si riveli impossibile o implichi uno sforzo sproporzionato. Il Titolare comunica all'Utente tali destinatari qualora egli lo richieda.",
  },
  // US section is embedded in Italian document (kept in English as provided)
  { type: 'h2', text: 'Further information for Users in the United States' },
  {
    type: 'p',
    text: 'This part of the document integrates with and supplements the information contained in the rest of the privacy policy and is provided by the business running this Application and, if the case may be, its parent, subsidiaries and affiliates (for the purposes of this section referred to collectively as "we", "us", "our").\n\nThe information contained in this section applies to all Users (Users are referred to below, simply as "you", "your", "yours"), who are residents in the following states: California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana.\n\nFor such Users, this information supersedes any other possibly divergent or conflicting provisions contained in the privacy policy.\n\nThis part of the document uses the term Personal Information.',
  },
  { type: 'h3', text: 'Notice at collection' },
  {
    type: 'p',
    text: 'The following Notice at collection provides you with timely notice about the categories of Personal Information collected or disclosed in the past 12 months so that you can exercise meaningful control over our use of that Information.\n\nWhile such categorization of Personal Information is mainly based on California privacy laws, it can also be helpful for anyone who is not a California resident to get a general idea of what types of Personal Information are collected.\n\nℹ️ You can read the definitions of these concepts inside the "Definitions and legal references section" of the privacy policy.\n\nTo know more about your rights you can refer to the "Your privacy rights under US state laws" section of our privacy policy.\n\nFor more details on the collection of Personal Information, please read the section "Detailed information on the processing of Personal Data" of our privacy policy.\n\nWe won\'t process your Information for unexpected purposes, or for purposes that are not reasonably necessary to and compatible with the purposes originally disclosed, without your consent.',
  },
  { type: 'h3', text: 'What are the sources of the Personal Information we collect?' },
  {
    type: 'p',
    text: 'We collect the above-mentioned categories of Personal Information, either directly or indirectly, from you when you use this Application.\n\nFor example, you directly provide your Personal Information when you submit requests via any forms on this Application. You also provide Personal Information indirectly when you navigate this Application, as Personal Information about you is automatically observed and collected.',
  },
  { type: 'h3', text: 'Your privacy rights under US state laws' },
  {
    type: 'p',
    text: 'You may exercise certain rights regarding your Personal Information. In particular, to the extent permitted by applicable law, you have:',
  },
  {
    type: 'bullets',
    items: [
      'the right to access Personal Information: the right to know. You have the right to request that we confirm whether or not we are processing your Personal Information. You also have the right to access such Personal Information;',
      'the right to correct inaccurate Personal Information. You have the right to request that we correct any inaccurate Personal Information we maintain about you;',
      'the right to request the deletion of your Personal Information. You have the right to request that we delete any of your Personal Information;',
      'the right to obtain a copy of your Personal Information. We will provide your Personal Information in a portable and usable format that allows you to transfer data easily to another entity – provided that this is technically feasible;',
      'the right to opt out from the Sale of your Personal Information; We will not discriminate against you for exercising your privacy rights.',
      'the right to non-discrimination.',
    ],
  },
  { type: 'h3', text: 'Additional rights for Users residing in California' },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in California, you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the Sharing of your Personal Information for cross-context behavioral advertising;',
      'The right to request to limit our use or disclosure of your Sensitive Personal Information to only that which is necessary to perform the services or provide the goods, as is reasonably expected by an average consumer. Please note that certain exceptions outlined in the law may apply, such as, when the collection and processing of Sensitive Personal Information is necessary to verify or maintain the quality or safety of our service.',
    ],
  },
  {
    type: 'h3',
    text: 'Additional rights for Users residing in Virginia, Colorado, Connecticut, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana',
  },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in Virginia, Colorado, Connecticut, Texas, Oregon, Nevada, Delaware, Iowa, New Hampshire, New Jersey, Nebraska and Montana you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the processing of your personal information for Targeted Advertising or profiling in furtherance of decisions that produce legal or similarly significant effects concerning you;',
      'The right to freely give, deny or withdraw your consent for the processing of your Sensitive Personal Information. Please note that certain exceptions outlined in the law may apply, such as, but not limited to, when the collection and processing of Sensitive Personal Information is necessary for the provision of a product or service specifically requested by the consumer.',
    ],
  },
  { type: 'h3', text: 'Additional rights for users residing in Utah and Iowa' },
  {
    type: 'p',
    text: 'In addition to the rights listed above common to all Users in the United States, as a User residing in Utah and Iowa, you have',
  },
  {
    type: 'bullets',
    items: [
      'The right to opt out of the processing of your Personal Information for Targeted Advertising;',
      'The right to opt out of the processing of your Sensitive Personal Information. Please note that certain exceptions outlined in the law may apply, such as, but not limited to, when the collection and processing of Sensitive Personal Information is necessary for the provision of a product or service specifically requested by the consumer.',
    ],
  },
  { type: 'h3', text: 'How to exercise your privacy rights under US state laws' },
  {
    type: 'p',
    text: "To exercise the rights described above, you need to submit your request to us by contacting us via the contact details provided in this document.\n\nFor us to respond to your request, we must know who you are. We will not respond to any request if we are unable to verify your identity and therefore confirm the Personal Information in our possession relates to you. You are not required to create an account with us to submit your request. We will use any Personal Information collected from you in connection with the verification of your request solely for verification and shall not further disclose the Personal Information, retain it longer than necessary for purposes of verification, or use it for unrelated purposes.\n\nIf you are an adult, you can make a request on behalf of a child under your parental authority.",
  },
  { type: 'h3', text: 'How to exercise your rights to opt out' },
  {
    type: 'p',
    text: 'In addition to what is stated above, to exercise your right to opt-out of Sale or Sharing and Targeted Advertising you can also use the privacy choices link provided on this Application.\n\nIf you want to submit requests to opt out of Sale or Sharing and Targeted Advertising activities via a user-enabled global privacy control, such as for example the Global Privacy Control ("GPC"), you are free to do so and we will abide by such request in a frictionless manner.',
  },
  { type: 'h3', text: 'How and when we are expected to handle your request' },
  {
    type: 'p',
    text: 'We will respond to your request without undue delay, but in all cases within the timeframe required by applicable law. Should we need more time, we will explain to you the reasons why, and how much more time we need.\n\nShould we deny your request, we will explain to you the reasons behind our denial (where envisaged by applicable law you may then contact the relevant authority to submit a complaint).\n\nWe do not charge a fee to process or respond to your request unless such request is manifestly unfounded or excessive and in all other cases where it is permitted by the applicable law. In such cases, we may charge a reasonable fee or refuse to act on the request. In either case, we will communicate our choices and explain the reasons behind them.',
  },
  { type: 'h2', text: 'Ulteriori informazioni sul trattamento' },
  { type: 'h3', text: 'Difesa in giudizio' },
  {
    type: 'p',
    text: "I Dati Personali dell'Utente possono essere utilizzati da parte del Titolare in giudizio o nelle fasi preparatorie alla sua eventuale instaurazione per la difesa da abusi nell'utilizzo di questa Applicazione o dei Servizi connessi da parte dell'Utente.\n\nL'Utente dichiara di essere consapevole che il Titolare potrebbe essere obbligato a rivelare i Dati per ordine delle autorità pubbliche.",
  },
  { type: 'h3', text: 'Informative specifiche' },
  {
    type: 'p',
    text: "Su richiesta dell'Utente, in aggiunta alle informazioni contenute in questa privacy policy, questa Applicazione potrebbe fornire all'Utente delle informative aggiuntive e contestuali riguardanti Servizi specifici, o la raccolta ed il trattamento di Dati Personali.",
  },
  { type: 'h3', text: 'Log di sistema e manutenzione' },
  {
    type: 'p',
    text: "Per necessità legate al funzionamento ed alla manutenzione, questa Applicazione e gli eventuali servizi terzi da essa utilizzati potrebbero raccogliere log di sistema, ossia file che registrano le interazioni e che possono contenere anche Dati Personali, quali l'indirizzo IP Utente.",
  },
  { type: 'h3', text: 'Informazioni non contenute in questa policy' },
  {
    type: 'p',
    text: 'Ulteriori informazioni in relazione al trattamento dei Dati Personali potranno essere richieste in qualsiasi momento al Titolare del Trattamento utilizzando gli estremi di contatto.',
  },
  { type: 'h3', text: 'Modifiche a questa privacy policy' },
  {
    type: 'p',
    text: "Il Titolare del Trattamento si riserva il diritto di apportare modifiche alla presente privacy policy in qualunque momento notificandolo agli Utenti su questa pagina e, se possibile, su questa Applicazione nonché, qualora tecnicamente e legalmente fattibile, inviando una notifica agli Utenti attraverso uno degli estremi di contatto di cui è in possesso. Si prega dunque di consultare con frequenza questa pagina, facendo riferimento alla data di ultima modifica indicata in fondo.\n\nQualora le modifiche interessino trattamenti la cui base giuridica è il consenso, il Titolare provvederà a raccogliere nuovamente il consenso dell'Utente, se necessario.",
  },
];

export const privacyContent: Record<'it' | 'en', PolicyBlock[]> = { it, en };
