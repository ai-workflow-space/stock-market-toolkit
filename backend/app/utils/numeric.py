import math


def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _clean_list(lst):
    return [_clean(v) for v in lst]