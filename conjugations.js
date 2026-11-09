window.ConjugationProvider = {
  getConjugaciones(infinitivo) {
    if (!infinitivo || !window.__conjugator) return null;
    const verb = infinitivo.toLowerCase().trim();

    const castellano = window.__conjugator.conjugateSync(verb, 'castellano');
    const voseo = window.__conjugator.conjugateSync(verb, 'voseo');
    const formal = window.__conjugator.conjugateSync(verb, 'formal');

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

    // Voseo (index 1)
    let vosPresent = null, vosImp = null;
    if (voseo && typeof voseo !== 'string' && voseo[0]) {
      const vc = voseo[0].conjugation;
      vosPresent = vc?.Indicativo?.Presente?.[1] || null;
      vosImp = vc?.Imperativo?.Afirmativo?.[1] || null;
    }

    // Formal region supplies usted (idx 2) and ustedes (idx 5) imperatives
    let ustedImpAff = null, ustedImpNeg = null;
    let ustedesImpAff = null, ustedesImpNeg = null;
      // Formal region: index 1 = usted, index 4 = ustedes
      if (formal && typeof formal !== 'string' && formal[0]) {
        const fc = formal[0].conjugation;
        ustedImpAff = fc?.Imperativo?.Afirmativo?.[1] || null;
        ustedImpNeg = fc?.Imperativo?.Negativo?.[1] || null;
        ustedesImpAff = fc?.Imperativo?.Afirmativo?.[4] || null;
        ustedesImpNeg = fc?.Imperativo?.Negativo?.[4] || null;
      }
    const usted = person(2);
    usted.imperativo = [ustedImpAff, ustedImpNeg].filter(v => v && v !== '-');

    const ustedes = person(5);
    ustedes.imperativo = [ustedesImpAff, ustedesImpNeg].filter(v => v && v !== '-');

    return {
      yo: person(0),
      tu: person(1),
      usted,
      nosotros: person(3),
      vosotros: person(4),
      ustedes,
      vos: [vosPresent, vosImp].filter(Boolean),
      gerundio: c.Impersonal?.Gerundio || null,
      participio: c.Impersonal?.Participio || null
    };
  }
};
