function calcularDiasUnicos(periodos) {
    if (!Array.isArray(periodos) || periodos.length === 0) {
        return 0;
    }

    const periodosOrdenados = periodos
        .map(periodo => ({
            inicio: new Date(periodo.inicio),
            fin: new Date(periodo.fin)
        }))
        .sort((a, b) => a.inicio - b.inicio);

    const fusionados = [];

    for (const periodo of periodosOrdenados) {
        if (fusionados.length === 0) {
            fusionados.push(periodo);
            continue;
        }

        const ultimo = fusionados[fusionados.length - 1];

        if (periodo.inicio <= ultimo.fin) {
            if (periodo.fin > ultimo.fin) {
                ultimo.fin = periodo.fin;
            }
        } else {
            fusionados.push(periodo);
        }
    }

    let totalDias = 0;

    for (const periodo of fusionados) {
        const diferenciaMs = periodo.fin - periodo.inicio;
        const dias = Math.floor(
            diferenciaMs / (1000 * 60 * 60 * 24)
        ) + 1;

        totalDias += dias;
    }

    return totalDias;
}

module.exports = {
    calcularDiasUnicos
};