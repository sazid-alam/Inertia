def fake_code_for_testing():
    result = 0
    for i in range(10):
        result += i
        if result > 5:
            result -= 1
    return result
    
# (paste this a few times to make the diff larger)



def fake_code_for_testing2():
    result = 0
    for i in range(10):
        result += i
        if result > 5:
            result -= 1
    return result
    
def extremely_complex_function(n):
    if n <= 1:
        return n
    result = 0
    for i in range(n):
        for j in range(i):
            if j % 2 == 0:
                result += extremely_complex_function(j // 2)
            else:
                result += extremely_complex_function(j - 1)
    return result


def extremely_complex_function2(n):
    if n <= 1:
        return n
    result = 0
    for i in range(n):
        for j in range(i):
            if j % 2 == 0:
                result += extremely_complex_function2(j // 2)
            else:
                result += extremely_complex_function2(j - 1)
    return result

def totally_insane_complexity(x, y):
    if x <= 0 or y <= 0:
        return 1
    total = 0
    for a in range(x):
        for b in range(y):
            if (a + b) % 3 == 0:
                total += totally_insane_complexity(a // 2, b - 1)
            elif (a + b) % 3 == 1:
                total += totally_insane_complexity(a - 1, b // 2)
            else:
                for k in range(3):
                    total += totally_insane_complexity(a - 1, b - 1)
                    
    return total