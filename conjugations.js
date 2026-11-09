window.ConjugationProvider = {
  getConjugaciones(infinitivo) {
    if (!infinitivo || !window.__conjugator) return null;
    const verb = infinitivo.toLowerCase().trim();

    const castellano = window.__conjugator.conjugateSync(verb, 'castellano');
    const voseo = window.__conjugator.conjugateSync(verb, 'voseo');

    if (!castellano || typeof castellano === 'string' || !castellano[0]) return null;

    const c = castellano[0].conjugation;
    if (!c) return null;

    const person = (idx) => ({
      indicativo: [
        c.Indicativo?.PreteritoIndefinido?.[idx],
        c.Indicativo?.PreteritoImperfecto?.[idx],
        c.Indicativo?.Presente?.[idx],
        c.Indicativo?.FuturoImperfecto?.[idx],
        c.Indicativo?.CondicionalSimple?.[idx]
      ].filter(Boolean),
      subjuntivo: [
        c.Subjuntivo?.PreteritoImperfectoSe?.[idx],
        c.Subjuntivo?.PreteritoImperfectoRa?.[idx],
        c.Subjuntivo?.Presente?.[idx],
        c.Subjuntivo?.FuturoImperfecto?.[idx]
      ].filter(Boolean),
      imperativo: [
        c.Imperativo?.Afirmativo?.[idx],
        c.Imperativo?.Negativo?.[idx]
      ].filter(v => v && v !== '-')
    });

    // Voseo forms live in the separate voseo result, person index 1
    let vosPresent = null;
    let vosImp = null;
    if (voseo && typeof voseo !== 'string' && voseo[0]) {
      const vc = voseo[0].conjugation;
      vosPresent = vc?.Indicativo?.Presente?.[1] || null;
      vosImp = vc?.Imperativo?.Afirmativo?.[1] || null;
    }

    return {
      yo: person(0),
      tu: person(1),
      usted: person(2),
      nosotros: person(3),
      vosotros: person(4),
      ustedes: person(5),
      vos: [vosPresent, vosImp].filter(Boolean),
      gerundio: c.Impersonal?.Gerundio || null,
      participio: c.Impersonal?.Participio || null
    };
  }
};
