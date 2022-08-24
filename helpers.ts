export const getTokenPlaceholder = (context) => {
  const invocationToken = context.invocationToken;
  return '{{token-' + invocationToken + '}}';
};

export const extractNextUrlPagination = (response) => {
  let nextUrl;
  const link = response.headers.link;
  if (link) {
    const parts = link.split(',');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (part.indexOf('next') !== -1) {
        nextUrl = part.split(';')[0].trim().slice(1, -1);
        break;
      }
    }
  }

  return nextUrl;
};

export const cleanQueryParams = (params) => {
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
};
