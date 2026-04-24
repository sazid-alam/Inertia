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