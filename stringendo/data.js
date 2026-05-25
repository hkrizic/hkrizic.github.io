// Shared data for the Stringendo site.
// Edit names / dates here — pages read from this single source.

const ENSEMBLES = [
  {
    id: "kids",
    name: "Stringendo4Kids",
    age: "ab ca. 9 Jahren",
    color: "green",
    tagline: "Der allererste Klang.",
    description:
      "Einstiegsensemble für junge Streicher:innen. Gemeinsames Musizieren von Anfang an, mit altersgerechtem Repertoire und sorgfältiger pädagogischer Begleitung.",
    leitung: "Susanna Unseld & Jens Lohmann",
    probe: "Freitag · 19:30 · Römerhof",
    musicians: [
      ["Matthieu", "assets/musicians/matthieu.jpg"],
      ["Carlo", "assets/musicians/carlo.jpg"],
      ["Miron", "assets/musicians/miron.jpg"],
      ["Timmy", "assets/musicians/timmy.jpg"],
      ["Nathan", "assets/musicians/nathan.jpg"],
      ["Krisztina", "assets/musicians/krisztina.jpg"],
      ["Joshua", "assets/musicians/joshua.jpg"],
      ["Josephine", "assets/musicians/josephine.jpg"],
      ["Jann", "assets/musicians/jann.jpg"],
      ["Hugo", "assets/musicians/hugo.jpg"],
      ["Aurea", "assets/musicians/aurea.jpg"]
    ]
  },
  {
    id: "teens",
    name: "Stringendo14",
    age: "ca. 14–19 Jahre",
    color: "blue",
    tagline: "Das Herzstück.",
    description:
      "Kernorchester für talentierte Jugendliche im Alter von ca. 14 bis 19 Jahren. Wöchentliche Proben, regelmässige Konzerte und ein Repertoire vom Barock über die Wiener Klassik bis in die Romantik.",
    leitung: "Jens Lohmann",
    probe: "Donnerstag · 18:30 · MKZ Zürich",
    musicians: [
      // Active members
      ["Lena", "assets/musicians/lena.jpg", { also: "twenty" }],
      ["Afnan", "assets/musicians/afnan.jpg"],
      ["Maxim", "assets/musicians/maxim.jpg"],
      ["Ava", "assets/musicians/ava.jpg"],
      ["Agustina", "assets/musicians/agustina.jpg"],
      ["Pjotr", "assets/musicians/pjotr.jpg"],
      ["Mia", "assets/musicians/mia.jpg"],
      ["Hannah", "assets/musicians/hannah.jpg", { also: "twenty" }],
      ["Kaon", "assets/musicians/kaon.jpg", { also: "twenty" }],
      ["Suya", "assets/musicians/suya.jpg"],
      ["Johanna L.", "assets/musicians/johanna.jpg"],
      ["Rhea", "assets/musicians/rhea.jpg", { also: "twenty" }],
      ["Mark", "assets/musicians/mark.jpg", { also: "twenty" }],
      ["Elodie", "assets/musicians/elodie.jpg"],
      ["Edna", "assets/musicians/edna.jpg"],
      ["Carolina", "assets/musicians/carolina.jpg"],
      ["Anna", "assets/musicians/anna.jpg", { also: "twenty" }],
      // Alumni
      ["Timea", "assets/musicians/timea.jpg", { alumni: true }],
      ["Klara", "assets/musicians/klara.jpg", { alumni: true }],
      ["Julien", "assets/musicians/julien-2.jpg", { alumni: true }],
      ["Johanna", "assets/musicians/johanna-2.jpg", { alumni: true }],
      ["Nicholas", "assets/musicians/nicholas.jpg", { alumni: true }],
      ["Michelle", "assets/musicians/michelle.jpg", { alumni: true }],
      ["Ladina", "assets/musicians/ladina.jpg", { alumni: true }],
      ["Ilaria", "assets/musicians/ilaria.jpg", { alumni: true }],
      ["Aaron", "assets/musicians/aaron.jpg", { alumni: true }]
    ]
  },
  {
    id: "twenty",
    name: "Stringendo2.0",
    age: "Studierende & junge Profis",
    color: "red",
    tagline: "Das Herzstück 2.0.",
    description:
      "Ein Ensemble für fortgeschrittene junge Musiker:innen, die ihre musikalische Entwicklung auf hohem Niveau weiterführen möchten — ob im Musikstudium, neben einem anderen Studium oder darüber hinaus.",
    leitung: "Jens Lohmann",
    probe: "Projektweise · Zürich",
    musicians: [
      // Active members — Pierina & Vianne spielen auch in Stringendo14
      ["Laila", "assets/musicians/laila.jpg"],
      ["Yuma", "assets/musicians/yuma.jpg"],
      ["Hrvoje (Harry)", "assets/musicians/hrvoje.jpg"],
      ["Caroline", "assets/musicians/caroline.jpg"],
      ["Marina", "assets/musicians/marina.jpg"],
      ["Stefanie", "assets/musicians/stefanie.jpg"],
      ["Isabelle", "assets/musicians/isabelle.jpg"],
      ["Vianne", "assets/musicians/vianne.jpg", { also: "teens" }],
      ["Luschan", "assets/musicians/luschan.jpg"],
      ["Pierina", "assets/musicians/pierina.jpg", { also: ["teens", "kids"] }],
      ["Sophie", "assets/musicians/sophie.jpg"],
      ["Patricia", "assets/musicians/patricia.png"],
      // Alumni
      ["Simon", "assets/musicians/simon.jpg", { alumni: true }],
      ["Odilia", "assets/musicians/odilia.jpg", { alumni: true }],
      ["Mischa", "assets/musicians/mischa.jpg", { alumni: true }],
      ["Mirjam", "assets/musicians/mirjam.jpg", { alumni: true }],
      ["Jonas", "assets/musicians/jonas.jpg", { alumni: true }],
      ["Zhixin Zhang", "assets/musicians/zhixin-zhang.png", { alumni: true }],
      ["Ana Maria", "assets/musicians/ana-maria.jpg", { alumni: true }]
    ]
  },
  {
    id: "zurich",
    name: "StringendoZürich",
    age: "Profis",
    color: "yellow",
    tagline: "Die Profis.",
    description:
      "Professionelles Streichensemble mit Mitgliedern des Galatea Quartetts und des Schweizer Oktetts. Konzerte u. a. im KKL Luzern, an der Zürcher Wasserkirche und am Festival «Herbst in der Helferei». In regelmässigem Austausch mit den jüngeren Generationen.",
    leitung: "Jens Lohmann",
    probe: "Projektweise · Wasserkirche & weitere",
    musicians: [
      // Screenshot 7
      ["Yuka", "assets/musicians/yuka.jpg"],
      ["Susanna", "assets/musicians/susanna.jpg"],
      ["Solme", "assets/musicians/solme.jpg"],
      ["Sarah", "assets/musicians/sarah.jpg"],
      ["Romaine", "assets/musicians/romaine.jpg"],
      ["Kyeongha", "assets/musicians/kyeongha.jpg"],
      ["Katarzynka", "assets/musicians/katarzynka.jpg"],
      ["Justina", "assets/musicians/justina.png"],
      ["Julien", "assets/musicians/julien.jpg"],
      ["Jens", "assets/musicians/jens.jpg"],
      ["Gallus", "assets/musicians/gallus.jpg"],
      ["Anne", "assets/musicians/anne.jpg"]
    ]
  }
];

const CONCERTS = {
  next: {
    date: { day: "28", month: "Jun", year: "2026" },
    title: "«Facettenreich»",
    where: "Grosse Kirche Fluntern · Gellertstrasse 2, 8044 Zürich",
    program: "Werke von Williams, Tschaikovsky und Bartók · Streichorchester Stringendo · Leitung Jens Lohmann · Solist Paul Handschke (Violoncello).",
    time: "Sonntag · 17:30",
    tickets:
      "https://eventfrog.ch/de/p/klassik-opern/klassik/facettenreich-grosse-kirche-fluntern-7448466809122981391.html",
    flyer: "assets/flyers/Stringendo-Sommerkonzert-Kirche-Fluntern.pdf",
    image: "assets/flyers/facettenreich-cover.jpg"
  },
  upcoming: [],
  archive: [
    {
      title: "Karfreitagskonzert",
      subtitle: "Mendelssohn Bartholdy: Paulus op. 36",
      where: "St. Johann, Schaffhausen",
      date: "2./3. April 2026",
      detail:
        "Mit Schaffhauser Oratorienchor, Orchester Stringendo Zürich; Soli: Şen Acar, Rolf Romei, Szymon Chojnacki; Leitung Kurt Müller Klusman.",
      image: "assets/events/karfreitag-2026.jpg",
      tag: "Karwoche 2026"
    },
    {
      title: "Concerto",
      subtitle: "Schüler:innen als Solist:innen",
      where: "Musikzentrum Florhofgasse",
      date: "11. April 2026",
      detail:
        "Schüler:innen von MKZ Zürichberg treten als Solist:innen mit Orchester Stringendo14 auf. Leitung: Jens Lohmann.",
      image: "assets/events/concerto-2026.jpg",
      tag: "April 2026"
    },
    {
      title: "Pfingstkonzerte",
      subtitle: "Kloster Fahr",
      where: "Kloster Fahr",
      date: "23./24. Mai 2026",
      detail:
        "Gemeinsame Pfingstkonzerte mit dem Schweizer Oktett (CH8) und Stringendo im Kloster Fahr.",
      image: "assets/events/pfingstkonzert-2026.jpg",
      flyer: "assets/flyers/Pfingstkonzert-Kloster-Fahr.pdf",
      tag: "Pfingsten 2026"
    }
  ],
  seasonal: [
    {
      title: "Herbst",
      where: "Festival «Herbst in der Helferei»",
      note: "Konzerte mit internationalen Gastsolist:innen, jeweils im Herbst in Zürich.",
      link: "https://www.herbst-helferei.ch/"
    },
    {
      title: "Adventszeit",
      where: "Zürich & Stuttgart",
      note: "Kleine wiederkehrende Konzertreise am 3. Adventswochenende."
    },
    {
      title: "Pfingsten",
      where: "Kloster Fahr",
      note: "Pfingst-Festival gemeinsam mit dem Schweizer Oktett."
    },
    {
      title: "Neujahr",
      where: "Zürich",
      note: "Neujahrskonzert mit Stringendo2.0 und dem Schweizer Oktett."
    },
    {
      title: "Sommerkonzert",
      where: "Zürich",
      note: "Alljährliches Sommerkonzert."
    },
    {
      title: "Musikkurswochen",
      where: "Arosa & Bad Ragaz",
      note: "Probenwochen im Frühling und Sommer."
    }
  ]
};

// Vorstellungen der Musiker:innen — Karten erscheinen beim Klick auf ein Porträt.
// Key = WordPress slug / local portrait filename stem.
// quote = erster Absatz der WP-Seite, text = weitere Absätze.
// Wo kein Eintrag existiert, zeigt die Karte einen Platzhaltertext.
const BIOS = {
  "hrvoje": {
    quote: "Stringendo ist für mich weit mehr als ein Orchester: Es ist ein Ort intensiver musikalischer Arbeit, grosser Inspiration und enger Freundschaften.",
    text: [
      "Die Möglichkeit, mit Persönlichkeiten wie Mischa Maisky oder Patricia Kopatchinskaja zusammenzuspielen, ist etwas ganz Besonderes.",
      "Neben meinem Physik-PhD gibt mir Stringendo einen wertvollen Ausgleich und die Chance, mit guten Freunden auf hohem Niveau Musik zu machen."
    ]
  },
  "matthieu": {
    quote: "Stringendo bedeutet für mich, zusammen Musik zu machen und dabei Spaß zu haben.",
    text: [
      "Ich habe viele Freunde gefunden und es macht Spaß mit ihnen zu musizieren.",
      "Ich lerne auch sehr viel dazu und kriege viele Tipps."
    ]
  },
  "carlo": {
    quote: "Es bedeutet mir viel, mit anderen Kindern und Jugendlichen Musik zu machen. Gemeinsam entsteht etwas Grosses und ich kann meine Freude an der Musik teilen. Foto: Jürg Flückiger"
  },
  "miron": {
    quote: "Ich spiele sehr gerne Geige und freue mich jedes Mal auf die Stringendo-Probe am Freitag. Besonders schätze ich die Konzerte mit ihren vielen Momenten zunehmender Spannung.",
    text: [
      "Die vielfältige Stückauswahl finde ich grossartig, und besonders lebhaft und lustig ist mir Fiddle-Faddle in Erinnerung geblieben."
    ]
  },
  "timmy": {
    quote: "Ich bin Mitglied des Stringendo-Ensembles.\nDas gemeinsame Musizieren im Ensemble hat mir gezeigt, wie wichtig Zuhören, Zusammenarbeit und musikalische Verantwortung sind. Im Zusammenspiel mit anderen lerne ich, meinen eigenen Klang anzupassen und Teil eines gemeinsamen musikalischen Ausdrucks zu sein.\nDabei habe ich auch gute Freunde kennengelernt, was mir sehr viel bedeutet."
  },
  "nathan": {
    quote: "Es bereitet mir immer grosse Freude, am Freitag in die Stringendo Probe zu gehen. Wir lernen nicht nur musikalisch sehr viel, sondern haben auch neben dem Musizieren viel Spass miteinander."
  },
  "krisztina": {
    quote: "Durch das Stringendo habe ich viele gute Kolleginnen gefunden. Mit ihnen macht das gemeinsame Musizieren noch viel mehr Spass. Während den Proben schauen wir uns immer wieder an und lächeln. Auch wenn es mal anstrengend ist, ist die Stimmung super. Natürlich gehören auch die Pausen dazu, wo wir sehr viel gemeinsam lachen und Spass haben. Jeden Freitag Abend ist die Probe im Römerhof der krönende Abschluss der Woche."
  },
  "joshua": {
    quote: "Im Stringendo lerne ich immer viel, habe dabei Spass beim Proben und eine gute Zeit mit Freunden. Die Konzerte gehören einfach zu den schönsten und spannendsten Erlebnissen."
  },
  "josephine": {
    quote: "Ich freue mich immer im Stringendo meine Freundinnen zu sehen und es macht mir viel Spass mit den anderen Kindern zusammen Musik zu machen. Am Pult kann ich viel von Krisztina, unserer Stimmführerin lernen und das ist eine tolle Erfahrung für mich. Am besten gefallen mir die Konzerte und ich mag es, wenn wir viele verschiedene Werke spielen – schnelle und wilde Stücke mag ich am liebsten. Ich bin schon gespannt, was ich in der Zukunft noch alles mit dem Stringendo erleben werde…"
  },
  "jann": {
    quote: "Es ist toll, dass ich mit meiner Bratsche im Stringendo4Kids hörbar bin. Es ist ein tolles und wichtiges Instrument, das oft unterschätzt wird. Foto: Jürg Flückiger"
  },
  "hugo": {
    quote: "Stringendo bedeutet für mich musizieren mit coolen Kindern. An den Proben arbeiten wir sorgfältig , lernen viel und haben dabei Spaß. Das Repertoire ist immer abwechslungsreich und gefällt mir jedes Mal. Die Amosphäre genieße ich während den Konzerten sehr."
  },
  "aurea": {
    quote: "Stringendo bedeutet für mich mehr als nur ein musikalischer Begriff. Es heißt, gemeinsam immer stärker zu werden und mit wachsender Energie Musik zu machen. Im Orchester Stringendo4Kids erlebe ich in den Proben, wie wir immer besser zusammenfinden und aufeinander hören. Mit jeder Probe entsteht aus vielen einzelnen Stimmen ein gemeinsamer Klang voller Spannung, Freude und Energie."
  },
  "lena": {
    quote: "Im Stringendo mitzuspielen bedeutet vieles für mich. Es ist jedesmal schön, nach den Proben an einem Konzert für andere spielen zu dürfen. Stringendo bietet unglaubliche Möglichkeiten, an wunderschönen Orten zu spielen, mit Musikern und Musikerinnen, von denen man viel lernen kann. Auch von den anderen Mitspieler*innen kann man viel lernen und sich gegenseitig unterstützen. Ich habe in der Zeit in der ich jetzt mitspiele viele neue Freunde gefunden. Zeit mit tollen Menschen zu verbringen, zusammen Musik zu machen und gleichzeitig so viel zu lernen macht Stringendo für mich zu etwas ganz besonderem."
  },
  "afnan": {
    quote: "Das gemeinsame musizieren bereitet mir viel Freude. In jeder Probe herrscht eine gute Atmosphäre, was mich motiviert. Wir haben viele tolle Konzert und Projekt Möglichkeiten, in denen wir mit tollen Musikern zusammen arbeiten können. Unser jeweiliges Programm für die Konzerte ist immer vielfältig und originell. Ich freue mich schon jetzt auf weitere Erlebnisse!"
  },
  "maxim": {
    quote: "Seit einem Jahr spiele ich in diesem aussergewöhnlichen Jugendorchester mit.\nIn den wöchentlichen Proben erarbeiten wir abwechslungsreiche Programme mit weltbekannten Stars, die mich die Musik immer wieder neu entdecken lassen. Besonders wichtig sind aber auch die Pausen, in denen wir uns nicht nur erholen, sondern auch die neusten Witze austauschen :)"
  },
  "ava": {
    quote: "Ein Probeabend des Stringendo am Florhof in Zürich. Die Streicherklänge füllen den ganzen grossen Saal aus. In den Pausen wird viel geredet und gelacht. Nach klassisch-virtuosem Programm folgt nun die Belohnung: Klezmer! Die festlichen Nachschläge lassen unsere Instrumente tanzen. Wir schauen uns an, lächeln uns zu und beschleunigen. Wie ein starker Wind zieht das Ensemble alle mit. Genau das bedeutet Stringendo für mich: eine immer drängendere Leidenschaft und Freude, während wir gemeinsam musizieren."
  },
  "pjotr": {
    quote: "Für mich bedeutet Stringendo eine unvergleichliche Verbindung von Musik und Gemeinschaft. Ich bin noch nicht lange bei Stringendo, aber habe schon viele neue Dinge gelernt. Jede Probe ist eine neue Herausforderung, bei der ich nicht nur meine musikalischen Fähigkeiten verbessere, sondern auch das Zusammenspiel mit anderen MusikerInnen erlebe. Das Repertoire ist vielfältig und fordert mich immer wieder aufs Neue heraus."
  },
  "mia": {
    quote: "Das gemeinsame Musizieren im Stringendo ist etwas wunderbares für mich. Während man lernt ist auch für Spass garantiert. Hier hat jeder seinen Platz und es werden neue Freundschaften fürs Leben geschlossen."
  },
  "hannah": {
    quote: "Stringendo bedeutet mir sehr viel, denn ich habe sowohl die Möglichkeit in kurzer Zeit sehr viel zu lernen und dabei Spass zu haben als auch viele neue und tolle Menschen kennenzulernen."
  },
  "kaon": {
    quote: "Stringendo bedeutet für mich, miteinander zu musizieren. Es macht mir viel Spass in den Proben, weil das Zusammenmusizieren immer besonders schön klingt. Die schönen Farbklänge, die aus jedem von uns kommen, bilden ein wunderschönes Bild. In unserem Orchester ist es nicht nur die Musik, die ich mag, sondern auch meine Freunde. Zusammen sind wir wie eine vertraute Musikfamilie."
  },
  "suya": {
    quote: "An Stringendo liebe ich folgendes am meisten: Die Geimeinschaft. Alle verstehen sich super und es gibt bei den Proben immer etwas zu lachen. Jedoch ist nicht nur das Arbeitsklima sondern auch das „Arbeiten“ selbst toll. Gemeinsames Musizieren ist etwas sehr spezielles!"
  },
  "johanna": {
    quote: "Jede Woche treffen wir uns im Stringendo um gemeinsam zu musizieren. Es bereitet mir sehr viel Spaß zusammen neue Werke zu entdecken, zu erarbeiten und am Schluss an tollen Konzerten zu präsentieren.\nDas Stringendo bietet viele Möglichkeiten neue Freundschaften zu schließen, Neues zu entdecken und seine eigenen musikalischen Fähigkeiten zu verbessern und zu erweitern."
  },
  "rhea": {
    quote: "Schneller werden, Fahrt aufnehmen, vorwärts gehen –  das bedeutet „stringendo“ in der Musik. Und so geht es mir, seit ich in diesem Orchester spiele. Eine Vielfalt an Stilen, Konzerten, Arrangements, von Barock bis zu Jazz, von Mischa Maisky bis zu den Swing Kids, und als Fixpunkt die Probe am Freitag, die für mich jede Woche ein Highlight ist."
  },
  "mark": {
    quote: "Für mich bedeutet Stringendo nicht nur eine wöchentliche Orchesterprobe, sondern auch eine tolle Gruppe jungen MusikerInnen, die miteinander musizieren, Spass haben und zusammen einen wunderschönen Klang etwickeln."
  },
  "elodie": {
    quote: "Im Stringendo haben wir die Gelegenheit, viel Neues zu erfahren, beispielsweise lernen wir Musikstücke und Personen kennen. Die wöchentlichen Proben mit den Kolleginnen und Kollegen sind intensiv, machen aber gleichzeitig Spass, da wir mit grosser Hingabe musizieren. Die geprobten Stücke werden zum Abschluss freudig an einem Konzert aufgeführt."
  },
  "edna": {
    quote: "Jeden Freitag kann ich es kaum erwarten, am Abend in die Stringendo-Probe zu gehen. Das gemeinsame Musizieren bereitet mir viel Freude und ich fühle, wie die Musik gemeinsam mit unserem Orchester weiterentwickelt wird. Die schönsten Melodien von Bach bis Mozart erfüllen die Säle, in denen wir auftreten, und bereiten den Menschen viel Freude."
  },
  "carolina": {
    quote: "Der angenehme Ohrwurm nach den wöchentlichen Proben und meine durch das Kontrabassieren müden Beine sind eine schöne Erinnerung an die musikalischen Momente, die wir im Orchester teilen dürfen. Es ist unglaublich toll und bereichernd, mit Gleichgesinnten zu musizieren und gemeinsam Fortschritte zu machen. Besonders schön finde ich, wenn wir mit Mitgliedern anderer Stringendo-Generationen zusammen spielen und uns in der Musik vereint fühlen."
  },
  "anna": {
    quote: "Ich habe in beiden Stringendo- Generationen ganz neue Erfahrungen im Orchesterspiel gemacht. Das war unter anderem auch das Bratsche spielen, anfangs war das ein Muss und ganz neu, aber jetzt finde ich es toll und gibt mir nebst dem Geige spielen ein ganz anderer Blick auf die Orchesterwerke. Die intensive Vorbereitung, die Konzerte und das Zusammensein sind immer sehr schöne Momente. Daraus entstehen tolle Freundschaften."
  },
  "timea": {
    quote: "Stringendo bedeutet mir sehr viel, weil es mir Spass macht mit andern zu musizieren und viele neue Sachen zu lernen. Man lernt viele neue, nette Leute kennen und kann mit ihnen Freude an der Musik haben."
  },
  "klara": {
    quote: "Stringendo ist ein super Ensemble um Musik zu machen. Zusammen zu Musizieren, bedeutet mir viel. Man kann den Streicherklang richtig geniessen!"
  },
  "julien-2": {
    quote: "Stringendo macht mir sehr spass, weil ich viele tolle Menschen und super Musiker treffe und mit ihnen musizieren darf. Ein Konzert in einer wunderschönen Kirche oder einem bezaubernden Saal ist dann eine schöne Belohnung für die viele Arbeit!"
  },
  "johanna-2": {
    quote: "Ich bin erst grad neu dazugekommen. Ich hatte schon viel Freude am gemeinsamen Musizieren und freue mich auf vieles Erwartetes und Unerwartetes, das ich beim Stringendo noch erleben werde!"
  },
  "nicholas": {
    quote: "Orchesterspielen ist viel mehr als nur in einer Gruppe musizieren. Besonders im Stringendo gibt es zwischendurch immer wieder etwas zu lachen oder rätseln. Wir spielen auch immer interessante und abwechslungsreiche Stücke. Im stringendo fühle ich mich wohl und jede Probe macht enorm Spass."
  },
  "michelle": {
    quote: "Für mich bedeutet Stringendo Musik, Freundschaft und Spass. Die Proben am Freitagabend sind ein idealer Start in das Wochenende."
  },
  "ladina": {
    quote: "Musik zu machen ist unsere Leidenschaft. Mit Stringendo können wir uns dabei gemeinsam weiterentwickeln. Wenn wir uns zur wöchentlichen Probe treffen, freue ich mich immer aufs gemeinsame musizieren. Stringendo motiviert mich auch fürs alleine üben. Die Konzerte sind immer schöne Erlebnisse."
  },
  "ilaria": {
    quote: "Das gemeinsame Musizieren im Stringendo macht mir viel Spass. Es motiviert mich zu Hause zu üben. Besonders gut gefallen mir die vielen Auftritte und das abwechslungsreiche Programm."
  },
  "aaron": {
    quote: "Freude an der Musik, stetig dazu lernen und eine grosse Vielfältigkeit; all das auf eine einzigartige Weise kombiniert bedeutet für mich Stringendo. Die musikalische Begegnung mit Gleichgesinnten jede Woche ist für mich eine spezielle Herausforderung, die ich nicht mehr missen möchte."
  },
  "laila": {
    quote: "Mit so vielen talentierten Musikerinnen und Musiker zusammen zu musizieren fordert mich auf eine postitive Art und Weise heraus.\nDas Stringendo bietet mir die Möglichkeit ein umfangreiches Repertoire kennenzulernen – auch ohne ein Musikstudium."
  },
  "caroline": {
    quote: "Stringendo ist so viel mehr als nur Orchester-Erfahrungen sammeln und ein hochstehendes Repertoire aufbauen; es ist ein Ort, an dem man jede Woche Freunde trifft und zusammen musiziert. Diese Freundschaften machen die Proben so einzigartig. Der Zusammenhalt wird nicht nur in den Proben gestärkt, sondern auch beispielsweise durch gemeinsames Reisen zu verschiedensten Konzerten, die Erinnerungen fürs Leben hinterlassen."
  },
  "marina": {
    quote: "Eine grosse Stärke von unserem Orchester ist die Art, wie es als Team zusammenspielt und zusammenhält. Ich empfinde es als grosse Ehre, zusammen mit so vielen talentierten Jugendlichen mitwirken zu dürfen. Seit der ersten Probe haben wir grosse Fortschritte gemacht und vieles erreicht und ich bin sehr gespannt, was die Zukunft alles noch bringen wird!"
  },
  "stefanie": {
    quote: "Das Stringendo gibt uns die Möglichkeit Erfahrungen zu sammeln, zusammen fleissig Werke zu lernen, man ist nicht nur eine Zahl sondern gehört zu der Stringendo-Familie. Im Stringendo hat man nicht nur die Möglichkeit von bekannten und erfolgreichen Musikern zu lernen sondern auch mit Ihnen zu musizieren."
  },
  "isabelle": {
    quote: "An guten wie auch an schlechten Tagen finden wir uns zusammen, denn auf die wöchentliche Probe ist Verlass. Und wenn der Tag lang war, bringt ihn der Pultnachbar mit Sicherheit schön zu Ende. Unser Orchester ist mehr als bloss ein Haufen Musiker, es ist eine Gruppe von Freunden, die immer aufs Neue wieder miteinander musizieren."
  },
  "vianne": {
    quote: "Ins Scheinwerferlicht blickend ist ein weiteres Konzert hinter uns; der Applaus war tobend und die Zugaben zahlreich. Die Vorbereitung auf unsere Konzerte, in welchen wir immer wieder mit einigen der grössten Solist§innen spielen dürfen, erfolgen durch harte Probe-Arbeit und viel Einsatzbereitschaft. Stringendo ist jedoch viel mehr als Proben und Konzerte: an diesem Ort habe ich die wundervollsten Menschen kennengelernt, und gemeinsam unterstützen wir uns gegenseitig und sind immer für einander da. Denn Musik ist mehr als Kunst, Musik ist Leben."
  },
  "luschan": {
    quote: "Vor einem halben Jahr bin ich dem Stringendo beigetreten. Jedes mal kommen neue interessante Stücke. Es wird effizient geübt mit guter Stimmung. Nach jedem Projekt bekommt man den Fortschritt zu spüren. Schnell Noten lesen, in kurzer Zeit effizient üben, Zusammenspiel im Orchester und eine humorvolle Atmosphäre helfen mir sehr in meiner musikalischen Ausbildung."
  },
  "pierina": {
    quote: "Aus den Bündner Bergen in eine neue Welt der Musik. Mit Stringendo durfte ich meinen musikalischen Horizont erweitern und neue, besondere Freundschaften über beide Generationen der Nachwuchsteams von Stringendo hinweg schliessen. All die unvergesslichen Konzerterlebnisse und tollen Erfahrungen schweissen uns zusammen und machen uns zu etwas Besonderem: Die Stringendofamilie."
  },
  "sophie": {
    quote: "Mit Stringendo verbinde ich viele schöne Erinnerungen, seien es die Herbst in der Helferei Wochen, oder die Reisen nach Stuttgart. Es macht unglaublich Spass, mit so vielen talentierten jungen Menschen zusammenzuarbeiten und als Gruppe zu wachsen."
  },
  "patricia": {
    quote: "Bei Stringendo habe ich die einmalige Chance, mein geigerisches Können zu erweitern  – auch ohne Musikstudium.  Insbesondere das Konzertieren mit  hochkarätigen Profimusikern spornt mich an, mein Bestes zu geben."
  },
  "simon": {
    quote: "Stringendo bedeutet für mich mit anderen begabten Jugendlichen zusammenzuspielen und dort Erfahrungen zu sammeln. Das lernen und üben von anspruchsvollen Werken in guter Atmosphäre und die Möglichkeit mit grossen Solisten auftreten zu können wie im Herbst in der Helferei ist fantastisch."
  },
  "odilia": {
    quote: "Seit sechs Jahren bin ich nun Teil der Stringendofamilie. In dieser Gemeinschaft gibt es immer viel zu lachen und vor allem viel zu lernen. Ich habe viele tolle Persönlichkeiten kennengelernt und wir können uns gemeinsam weiterbilden. Auch wenn Spieler kommen und gehen, der Kern des Stringendos, die Freude an der Musik und der Wille besser zu werden, bleibt bestehen."
  },
  "mischa": {
    quote: "Stringendo bedeutet für mich in kürzester Zeit Höchstleistungen zu bringen. Also kurz gesagt wie Profis behandelt zu werden. Dieser Anspruch und die damit verbundenen Erwartungen spornen mich an. Das Resultat davon sind unvergessliche Konzerte mit namhaften künstlerischen Persönlichkeiten auf den tollsten Bühnen."
  },
  "mirjam": {
    quote: "Schon seit vielen Jahren bin ich Teil dieses Ensembles. Ich bin mit Stringendo sozusagen musikalisch aufgewachsen. Dank Stringendo konnte ich schon mit grossen Künstlerpersönlichkeiten auf der Bühne stehen und durfte selbst schon einige Male solistisch auftreten. Stringendo pflegt die Kultur des Auftretens in unterschiedlichen Besetzungen, sei es in barocker Kammerformation oder in Sinfoniebesetzung mit Bläsern. Ich finde es schön, Teil der Stringendo-Tradition zu sein, und bin gespannt, wohin wir uns entwickeln werden."
  },
  "jonas": {
    quote: "Stringendo heisst für mich, in kürzester Zeit Bestleistungen zu bringen und dies in einer Gemeinschaft von Gleichgesinnten. Genau das ist es, was mich weiterbringt. Faszinierend an der Geige ist nicht nur ihr Klang, sondern auch das Handwerk, welches dahinter steckt. – „Die Finger müssen machen, was der Kopf will, nicht umgekehrt.“ Robert Schumann"
  },
  "ana-maria": {
    quote: "Stringendo ist für mich ein besonderer Ort: mit gleichaltrigen Jugendlichen musizieren, sich auf öffentliche Auftritte freuen und die faszinierende Vielfalt der klassischen Musik kennenlernen."
  },
  "yuka": {
    quote: "Yuka Tsuboi ist in Tokyo geboren. Sie ist Gründerin und Mitglied des Galatea Quartetts. 2011 erschien bei Sony das Debüt-Album „Bloch Landscapes“. 2012 wurde das Ensemble mit einem ECHO-Preis ausgezeichnet und 2013 folgte die Ehrung mit dem Kulturförderpreis des Kantons Zürich. Yuka studierte bei Kumiko Eto, Ana Chumachenco und Zakhar Bron. Von 2005 bis 2015 war sie Assistentin von Zakhar Bron an der ZHdK"
  },
  "susanna": {
    quote: "Susanna Unseld wird früh musikalisch gefördert, erhält Klavier- und Violinunterricht. 13-jährig debütiert sie mit Mozarts Klavierkonzert KV 414 in St. Gallen, kurz darauf in der Tonhalle Zürich. Auf beiden Instrumenten wird sie mehrfache Erstpreisträgerin im Finale des Schweizerischen Jugendmusikwettbewerbs. An die Matura am K+S-Gymnasium Rämibühl schliesst sich das Studium bei Zakhar Bron an der ZHdK an (2008 Lehr- und Konzertdiplom sowie 2010 Solistendiplom). Während ihrer Ausbildung wird sie mit Preisen an den Wettbewerben der Kiwanis-, Lions- und Rotary-Stiftungen, der Zürcher Hochschule sowie durch die Eurovisions-Auswahl ausgezeichnet. Weitere Studien und Meisterkurse folgen bei Ana Chumachenco, Nora Chastain, Nadezhda Korshakova und Thomas Brandis.- Seit ihrem Auftritt am Schoeck-Festival der Zürcher Tonhalle-Gesellschaft konzertiert sie regelmässig, z.B. als Schweizer Nachwuchs-Künstlerin in der Reihe „ZKO stellt vor“, oder auch in verschiedenen Ensembles wie dem Ensemble Boswil (für zeitgenössische Musik) und Stringendo Zürich. Schon während des Studiums – und seither regelmässig – wird sie auch als Bratschistin engagiert (sie spielt ein neugebautes Instrument von Michael Stürzenhofecker).- Seit 2012 unterrichtet Susanna Unseld eine eigene Klasse an Musikschule Konservatorium Zürich."
  },
  "solme": {
    quote: "Der Cellist Solme Hong verfolgt eine vielseitige Konzert- und Lehrtätigkeit. Studium in Bern, Stuttgart und Zürich. Mehrjähriges Mitglied von klassischen und genre-übergreifenden Ensembles, Auftritte an bedeutenden Festivals wie dem Lucerne Festival, Menuhin Festival, Murten Classics, Cully Jazz u.a.",
    text: [
      "Rege Konzerttätigkeit als Kammermusiker in der Schweiz und in Südkorea, europaweite Auftritte mit Nik Bärtsch’s Mobile Extended. 2011 Debut als Solist mit dem Chuncheon Philharmonic. 2015 Nomination für den PRIX netzhdk. Celloklassen an den Kantonsschulen Zürcher Oberland und Baden. CD- und Rundfunkaufnahmen für ECM, Traumton Records, Double Moon, BR, SRF u.a."
    ]
  },
  "sarah": {
    quote: "Sarah Kilchenmann studierte bei Prof. Gyula Stuller in Fribourg und bei Prof. Christine Busch an der Staatlichen Hochschule für Musik und Darstellende Kunst Stuttgart, wo sie mit der „Künstlerischen Ausbildung“ und dem „Solistendiplom“ abschloss. Weitere Impulse erhielt sie an Meisterkursen bei Tibor Varga, Boris Kuschnir und Michèle Auclair. Sie ist Preisträgerin verschiedener Wettbewerbe, u.a. “Junge Instrumentalisten” in Piracicaba (Brasilien), und war Stipendiantin der “Friedl-Waldstiftung” oder der L-Bank.",
    text: [
      "Sie ist Gründungsmitglied des „Galatea Quartett“, mit welchem sie in der ECMA (European Chamber Music Academy), mit Stephan Görner und mit dem Artemis Quartett studiert hat und zahlreiche Preise gewonnen hat, z.B. Concours de Genève, Chamber Music Competition Osaka, Concours de Bordeaux. Zahlreiche Radioaufnahmen bei DRS2 und Espace2 und CD-Aufnahmen bei Sony Classical oder Neos. Die bei Sony Classical erschiene Debüt-CD „Landscapes“ erhielt den ECHO-Preis 2012. 2013 wurde das Quartett mit dem Kulturförderpreis des Kanton Zürichs ausgezeichnet. Konzerte des Quartetts führen in bedeutende Säle wie die Wigmore Hall, das Concertgebouw Amsterdam, die Tonhalle Zürich oder das Teatro Rex in Buenos Aires und an die Festivals in Sion, EuroArt Prag, Pablo Casals und die Züricher Festspiele und Tage für Neue Musik."
    ]
  },
  "romaine": {
    quote: "Romaine Bolinger wurde 1989 in Zürich geboren und ist Geigerin im GaglianoTrio, Tarara Quartett und Zakhar Bron Chamber Orchestra. Sie spielt regelmässig mit dem Tonhalle Orchester Zürich entweder als Zuzügerin oder ad-interim Geigerin und seit Herbst 2016 mit dem Sinfonieorchester Basel, ebenfalls als Zuzügerin. Ihre sieben Studienjahre hat sie in der Meisterklasse von Professor Bron an der Zürcher Hochschule der Künste mit Auszeichnungen abgeschlossen. Ihre solistische Laufbahn führte sie in die berühmtesten Säle wie Gewandhaus Leipzig, Laeiszhalle Hamburg, Philharmonie Berlin und Tonhalle Zürich. Im Winter 2014 wurde sie an der Zakhar Bron School of Music als Violinlehrerin angestellt."
  },
  "kyeongha": {
    quote: "Die Violinistin Kyeongha Park konzertierte in vielen Ländern Europas und ist in Südkorea regelmässig als Solistin zu hören. Sie studierte in Wien bei Rainer Küchl (Magister-Diplom mit Auszeichnung) und in Zürich bei Rudolf Koelman und Wendy Enderle. Kyeongha Park spielt als Zuzügerin beim Musikkollegium Winterthur, absolvierte ein Praktikum bei den Stuttgarter Philharmonikern und war Gast-Konzertmeisterin beim Lochener Kammerorchester. An MKZ leitet sie eine Violinklasse."
  },
  "katarzynka": {
    quote: "Katarzyna Losiewicz wurde in Warschau geboren. Im Jahr 2000 schloss sie das Studium an der Musikakademie Warschau bei Prof. Stefan Kamasa mit dem Abschluss: „ausgezeichnet“ ab. In dieser Zeit spielte sie auch im Polish Festival Orchestra (gegründet und geleitet von Krystian Zimerman). 2002 studierte sie an der Musikhochschule Freiburg bei Prof. Wolfram Christ (Abschluss-Diplom mit der Note „sehr gut“). 2004 erhielt sie an der Hochschule für Musik in Köln bei Prof. Matthias Buchholz das Solistendiplom. In ihrer Musikkarriere hat sie als Solistin mit verschiedenen Orchestern in Polen, Deutschland und Frankreich gespielt. Ausserdem ist sie eine gefragte Kammermusikerin in verschiedenen Formationen. Seit 2004 spielte sie in Orchestern in Frankreich (L`Orchestre Nationale de Lyon, Opera de Lyon, Symphonique de Mulhouse) in der Schweiz (Opernhaus Zürich, Zürcher Kammerorchester, Luzerner Symphonie Orchester, Basel Symphonie Orchester). Seit 10 Jahren wohnt sie mit ihrer Familie in der Schweiz und arbeitet im Tonhalle Orchester Zürich."
  },
  "justina": {
    quote: "Justina Sromicki wurde 1983 in Zürich geboren. Im Alter von 7 Jahren bekam sie ihren ersten Geigenunterricht. Sie ist Preisträgerin mehrerer Wettbewerbe, unter anderem des Schweizerischen Jugendmusikwettbewerbes, des ORPHEUS Förderpreises sowie des Musikwettbewerbes Laupersdorf. 2007 erlangte sie ihr Konzertdiplom und 2010 ihr Lehrdiplom bei Professor Josef Rissin an der Zürcher Hochschule der Künste. Nachdem sie 2008 Mitglied des Gustav Mahler Jugendorchesters war, absolvierte sie 2010 / 2011 ein Orchesterpraktikum beim Basler Symphonieorchester. Seit 2007 ist sie Mitglied des Orchesters Stringendo unter der Leitung von Jens Lohmann. Sie unterrichtet am Konservatorium in Bern und an der MKZ in Zürich Violine."
  },
  "julien": {
    quote: "In Bern geboren, studiert Julien Kilchenmann zuerst am Konservatorium Fribourg bei Simon Zeller. 1994 gewinnt er am internationalen Musik-Wettbewerb in Piracicaba (Brasilien) den Zweiten Preis.",
    text: [
      "Er kommt 1999 in die Klasse von Walter Grimmer und 2002 in die Klasse von Roel Dieltiens an der Musikhochschule Zürich. 2003 gewinnt er den „Fond Pierre et René Glasson“-Wettbewerb in Freiburg und im selben Jahr den 1. Preis am internationalen Kammermusik-Wettbewerb in Minerbio (Italien) in der Formation Klaviertrio. 2006 gewinnt er den 1.Preis am Ninck-Wettbewerb Zürich. 2005 gründet er das Galatea Quartett mit dem er zahlreiche international Preise (Bordeaux, Osaka, Florenz etc.) gewinnt und Konzerte im Concertgebouw Amsterdam, der Wigmore Hall in London, Tonhalle Zürich etc. und zahlreiche Tourneen im Ausland (Japan, Argentinien, Indien, Ägypten, etc) gibt. 2012 gewinnt das Galatea Quartett mit der bei Sony classical erschienenen Debut CD, den ECHO-Klassik Preis und 2013 den Förderpreis des Kanton Zürich. In diesem Jahr erscheint ebenfalls bei Sony, die CD “belle époque”. Julien Kilchenmann ist regelmässig in verschiedenen Kammerorchestern tätig”. Er spielt auf einem Violoncello von Bernardo Calcani aus dem Jahr 1750."
    ]
  },
  "jens": {
    quote: "Jens Lohmann studiert nach der Matura Violine bei Aida Stucki in Winterthur und Yfrah Neaman an der Guildhall School London. Weitere Studien in Dirigieren (Luzern), Musikwissenschaften und Philosophie (Freiburg) erweitern seine musikalischen Horizonte ebenso wie die intensive Beschäftigung mit Neuer Musik. 1989 gewinnt er den Ersten Preis beim Schweizer Hochschulwettbewerb, 1991 eine Medaille beim Wettbewerb des Italienischen Fernsehens RAI zum Mozartjahr, im gleichen Jahr wird er mit dem Solistendiplom ausgezeichnet. Seither machte er zahlreiche Einspielungen für Rundfunk, Fernsehen und auf CD. Als Solist (u.a. mit dem English Chamber Orchestra), Gast-Konzertmeister (u.a. dem Zürcher Kammerorchester, dem Württembergischen Kammerorchester, der Camerata Schweiz), Kammermusiker (u.a. mit dem Schweizer Oktett) und regelmässiger Gast des Zürcher Tonhalle-Orchesters konzertiert er in den meisten Ländern Europas sowie in Afrika und Asien. Seit 1991 unterrichtet er in Zürich an Konservatorium (heute: MKZ) und der Hochschule (NF). Ausserdem engagiert er sich als Pädagoge regelmässig in Wettbewerbs-Jurys sowie als Dozent bei zahlreichen Kursen. 2006 initiierte er als Künstlerischer Leiter das Klassik-Festival Herbst in der Helferei in Zürich, welches seither jungen Musikern die Gelegenheit eröffnet, während einer Woche gemeinsam mit arrivierten Künstlern in Konzerten aufzutreten."
  },
  "gallus": {
    quote: "Erste musikalische Erfahrungen machte Gallus Burkard beim Registrieren auf der Orgelbank seines Vaters. Findet nach Umwegen über die Flöte zum Kontrabass. Studium am Konservatorium Zürich, Diplom mit Auszeichnung. Weitere Studien in  London bei Duncan Mc Tier, so wie zahlreiche Meisterkurse.",
    text: [
      "Seit 1990 Mitglied des Tonhalle-Orchesters Zürich. Erfahrungsausweitung durch Mitwirken in Jazz-, Klezmer- und Volksmusikformationen. Spielt seit 2001 ein selbst gebautes Instrument."
    ]
  },
  "anne": {
    quote: "Anne Battegay, 1988 in Zürich geboren, begann das Geigenspiel im Alter von sechs Jahren. 2007 begann sie ihr Studium bei Nora Chastain an der Zürcher Hochschule der Künste und schloss den Master Performance, sowie den Master Pedagogy mit Auszeichnung ab.",
    text: [
      "Anne Battegay sammelte schon früh Orchestererfahrung. So wirkte sie ab 2004 als festes Mitglied der ersten Violinen des Schweizer Jugend-Sinfonieorchesters mit, und nahm im Sommer 2009 an der Schleswig-Holstein Orchesterakademie teil. Seit Oktober 2010 ist sie Mitglied des Belenusquartettes, wo sie den zweiten Geigenpart übernimmt. Von August 2011 bis Juni 2012 absolvierte sie ein Praktikum im Sinfonieorchester Basel, und spielt dort regelmässig als Zuzügerin. Ebenso hält sie zwei Geigenlehrstellen an der Kantonsschule Zürcher Unterland und dem Gymnasium Liestal inne."
    ]
  }
};
// Featured audio — neu, prominent oben
const SPOTIFY_FEATURED = [
  {
    id: "1hlDUqj2AZjnm3S0x0YslK",
    title: "For a better world",
    artist: "Giora Feidman & Stringendo Zürich",
    note: "Eine neue Aufnahme mit dem Klarinettisten Giora Feidman — Stringendo Zürich als Streichorchester-Partner."
  }
];

// SoundCloud-Alben (älter)
const ALBUMS = [
  { id: "321442421", title: "Barocco Grosso", sub: "Vivaldi-Concerti" },
  { id: "320427237", title: "Opus 1", sub: "Piazzolla / Anderson" },
  { id: "320428379", title: "Stringendo 14", sub: "Respighi / Elgar / Sibelius" },
  { id: "321443272", title: "Conciertos del Sur", sub: "Villa-Lobos / Rodrigo" }
];

// Featured — die neuesten Aufnahmen
const VIDEOS_FEATURED = [
  {
    id: "FMPjXEBFGB8",
    title: "Beethoven · Streichquartette in f-Moll op. 95 & B-Dur op. 130",
    sub: "«Sinfonie» nach Mahlers Arrangement · Stringendo Zürich"
  },
  {
    id: "8wdvRvNkXdg",
    title: "Schubert · Rondo in A-Dur D. 438",
    sub: "für Violine und Orchester · Stringendo Zürich"
  }
];

// Archive — ältere Aufnahmen
const VIDEOS_ARCHIVE = [
  { id: "0nnBbkqKMyY", title: "Schubert · Der Tod und das Mädchen",       sub: "Stringendo Zürich" },
  { id: "2y5fslKHgOs", title: "Vaughan Williams · Fantasia on a Theme by Thomas Tallis", sub: "Stringendo Zürich" },
  { id: "ZjwkPZwVjzI", title: "Gala-Konzert mit Mischa Maisky",            sub: "Tonhalle Zürich" },
  { id: "AMs1gLdAee4", title: "mit dem Schumann Quartett",                  sub: "Kammermusik · live" },
  { id: "DmLah35612M", title: "Respighi mit Mario Venzago",                 sub: "Antiche Arie · Wasserkirche" }
];

// Back-compat alias for any older references
const VIDEOS = VIDEOS_ARCHIVE;
